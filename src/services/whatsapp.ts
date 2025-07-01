// src/services/whatsapp.ts

import { PatientPaymentSummary, WhatsAppMessageData } from '../types/payments';
import { messageTemplates, generateWhatsAppMessage } from '../config/paymentsMode';

// export interface WhatsAppMessageData {
//     phone: string;
//     message: string;
//     whatsappUrl: string;
// }

export class WhatsAppService {
    private formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        const cleanPhone = phone.replace(/\D/g, '');

        // If it starts with 0, remove it
        let formattedPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;

        // If it doesn't start with 55 (Brazil country code), add it
        if (!formattedPhone.startsWith('55') && false) {
            formattedPhone = '55' + formattedPhone;
        }

        return formattedPhone;
    }

    private formatCurrency(amount: number): string {
        return `R$ ${amount.toFixed(2).replace('.', ',')}`;
    }

    private formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    public generatePaymentRequestMessage(patient: PatientPaymentSummary): string {
        const totalAmount = this.formatCurrency(patient.total_amount);
        const pendingAmount = this.formatCurrency(patient.pending_amount);
        const lastSessionDate = this.formatDate(patient.last_session_date);

        return generateWhatsAppMessage(messageTemplates.paymentRequest, {
            patientName: patient.patient_name,
            lastSessionDate,
            totalSessions: patient.total_sessions,
            totalAmount,
            pendingAmount
        });
    }

    public generatePaymentReminderMessage(patient: PatientPaymentSummary): string {
        const pendingAmount = this.formatCurrency(patient.pending_amount);
        const lastSessionDate = this.formatDate(patient.last_session_date);

        return generateWhatsAppMessage(messageTemplates.paymentReminder, {
            patientName: patient.patient_name,
            lastSessionDate,
            pendingAmount
        });
    }

    public createWhatsAppLink(patient: PatientPaymentSummary, messageType: 'invoice' | 'reminder'): WhatsAppMessageData {
        // Get patient phone - use your phone for testing, but fallback to patient phone in production
        const testPhone = '+447866750132';
        const patientPhone = patient.telefone || testPhone;

        const formattedPhone = this.formatPhoneNumber(patientPhone);

        const message = messageType === 'invoice'
            ? this.generatePaymentRequestMessage(patient)
            : this.generatePaymentReminderMessage(patient);

        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);

        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${testPhone}?text=${encodedMessage}`;
        // const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

        return {
            phone: formattedPhone,
            message: message,
            whatsappUrl: whatsappUrl,
        };
    }
    public openWhatsAppLink(whatsappData: WhatsAppMessageData): void {
        // Open WhatsApp link in new tab/window
        window.open(whatsappData.whatsappUrl, '_blank');
    }

    // Convenience methods for direct use
    public sendPaymentRequest(patient: PatientPaymentSummary): void {
        const whatsappData = this.createWhatsAppLink(patient, 'invoice');
        this.openWhatsAppLink(whatsappData);
    }

    public sendPaymentReminder(patient: PatientPaymentSummary): void {
        const whatsappData = this.createWhatsAppLink(patient, 'reminder');
        this.openWhatsAppLink(whatsappData);
    }

    // Method to show preview before sending (for user confirmation)
    public previewMessage(patient: PatientPaymentSummary, messageType: 'invoice' | 'reminder'): WhatsAppMessageData {
        return this.createWhatsAppLink(patient, messageType);
    }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();