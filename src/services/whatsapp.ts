// src/services/whatsapp.ts
import { PatientPaymentSummary, WhatsAppMessageData } from '../types/payments';
import { BillingSummary } from '../types/calendar-only';
import { messageTemplates, generateWhatsAppMessage } from '../config/paymentsMode';

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

    public generatePaymentRequestMessage(patient: PatientPaymentSummary | BillingSummary): string {
        // Handle both PatientPaymentSummary and BillingSummary types
        let patientName: string;
        let totalSessions: number;
        let totalAmount: number;
        let sessionDates: string[] = [];

        if ('patient_name' in patient) {
            // PatientPaymentSummary type
            patientName = patient.patient_name;
            totalSessions = patient.total_sessions;
            totalAmount = patient.total_amount;
            // Use session_dates if available
            sessionDates = patient.session_dates || [];
        } else {
            // BillingSummary type
            patientName = patient.patientName;
            totalSessions = patient.sessionCount;
            totalAmount = patient.totalAmount / 100; // Convert from cents to reais
            // Extract dates from sessionSnapshots
            if (patient.sessionSnapshots) {
                sessionDates = patient.sessionSnapshots.map(snapshot => {
                    const date = new Date(snapshot.date);
                    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                });
            }
        }

        // Format the session dates list
        const sessionDatesList = sessionDates.map(date => `• ${date}`).join('\n');

        // Get month name in Portuguese
        const lastSessionDate = sessionDates.length > 0 ? sessionDates[sessionDates.length - 1] : '';
        const [day, month] = lastSessionDate.split('/');
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];
        const mes = month ? monthNames[parseInt(month) - 1] : '';

        // Format total amount
        const totalAmountFormatted = this.formatCurrency(totalAmount);

        return generateWhatsAppMessage(messageTemplates.paymentRequest, {
            patientName: patientName,
            mes: mes,
            totalSessions: totalSessions,
            sessionDatesList: sessionDatesList,
            totalAmount: totalAmountFormatted
        });
    }

    public generatePaymentReminderMessage(patient: PatientPaymentSummary | BillingSummary): string {
        let patientName: string;
        let pendingAmount: number;
        let lastSessionDate: string;

        if ('patient_name' in patient) {
            // PatientPaymentSummary type
            patientName = patient.patient_name;
            pendingAmount = patient.pending_amount;
            lastSessionDate = patient.last_session_date;
        } else {
            // BillingSummary type
            patientName = patient.patientName;
            pendingAmount = patient.totalAmount / 100;
            // Get the last session date from sessionSnapshots
            lastSessionDate = patient.sessionSnapshots && patient.sessionSnapshots.length > 0
                ? patient.sessionSnapshots[patient.sessionSnapshots.length - 1].date
                : new Date().toISOString();
        }

        const pendingAmountFormatted = this.formatCurrency(pendingAmount);
        const lastSessionDateFormatted = this.formatDate(lastSessionDate);

        return generateWhatsAppMessage(messageTemplates.paymentReminder, {
            patientName: patientName,
            lastSessionDate: lastSessionDateFormatted,
            pendingAmount: pendingAmountFormatted
        });
    }

    public createWhatsAppLink(patient: PatientPaymentSummary | BillingSummary, messageType: 'invoice' | 'reminder'): WhatsAppMessageData {
        // Get patient phone - handle both types
        let patientPhone: string | undefined;

        if ('telefone' in patient) {
            patientPhone = patient.telefone;
        } else if ('patient_name' in patient) {
            // For PatientPaymentSummary, we might need to fetch phone separately
            // or it should be included in the type
            patientPhone = (patient as any).telefone;
        }

        const testPhone = '+447866750132';
        const phoneToUse = patientPhone || testPhone;

        const formattedPhone = this.formatPhoneNumber(phoneToUse);

        const message = this.generatePaymentRequestMessage(patient)
        // const message = messageType === 'invoice'
        //     ? this.generatePaymentRequestMessage(patient)
        //     : this.generatePaymentReminderMessage(patient);

        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);

        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

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
    public sendPaymentRequest(patient: PatientPaymentSummary | BillingSummary): void {
        const whatsappData = this.createWhatsAppLink(patient, 'invoice');
        this.openWhatsAppLink(whatsappData);
    }

    public sendPaymentReminder(patient: PatientPaymentSummary | BillingSummary): void {
        const whatsappData = this.createWhatsAppLink(patient, 'reminder');
        this.openWhatsAppLink(whatsappData);
    }

    // Method to show preview before sending (for user confirmation)
    public previewMessage(patient: PatientPaymentSummary | BillingSummary, messageType: 'invoice' | 'reminder'): WhatsAppMessageData {
        return this.createWhatsAppLink(patient, messageType);
    }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();