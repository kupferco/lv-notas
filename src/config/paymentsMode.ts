// src/config/paymentsMode.ts

export type PaymentMode = 'simple' | 'advanced';
export type ViewMode = 'card' | 'list';

export const config = {
    // Payment Mode Configuration
    paymentMode: 'simple' as PaymentMode, // Change to 'simple' to enable simple mode
    // View Mode Configuration  
    viewMode: 'list' as ViewMode, // Change to 'list' to enable list view
};

// Payment mode utility functions
export const isSimpleMode = () => config.paymentMode === 'simple';
export const isAdvancedMode = () => config.paymentMode === 'advanced';

// View mode utility functions
export const isCardView = () => config.viewMode === 'card';
export const isListView = () => config.viewMode === 'list';

// WhatsApp Message Templates (No-emoji version for maximum compatibility)
export const messageTemplates = {
    paymentRequest: {
        // greeting: "Olá {patientName}!",
        greeting: "Olá,",
        title: "",
        paymentMethods: "",
        sessionDetails: `Em {mes}, foram {totalSessions} sessões:
{sessionDatesList}
Valor total: {totalAmount}`,
        requestMessage: "Chave PIX: (11) 982212939",
        closing: `Assim que confirmar o pagamento, vc receberá automaticamente a nota fiscal correspondente.
Obrigada`
    },

    paymentReminder: {
        greeting: "Oi {patientName}!",
        title: "*Lembrete Amigável*",
        intro: "Espero que esteja tudo bem! Só passando para lembrar sobre o pagamento pendente das nossas sessões.",
        sessionDetails: `Última sessão: {lastSessionDate}
Valor pendente: {pendingAmount}`,
        paymentMethods: `*Formas de pagamento:*
- PIX: [sua-chave-pix]
- Transferência bancária
- Cartão (presencial)`,
        requestMessage: "Sem pressa! Quando for conveniente para você.",
        closing: `Qualquer dúvida, é só me chamar!

Abraços!`
    }
};

// Message generation helper
export const generateWhatsAppMessage = (
    template: typeof messageTemplates.paymentRequest | typeof messageTemplates.paymentReminder,
    variables: {
        patientName: string;
        mes?: string;
        totalSessions?: number;
        sessionDatesList?: string;
        lastSessionDate?: string;
        totalAmount?: string;
        pendingAmount?: string;
    }
): string => {
    const sections = [
        template.greeting.replace('{patientName}', variables.patientName),
    ];

    if (template.title) {
        sections.push('', template.title);
    }

    if ('intro' in template && template.intro) {
        sections.push('', template.intro);
    }

    if (template.sessionDetails) {
        let sessionDetails = template.sessionDetails;

        // Replace all variables that exist
        if (variables.mes) {
            sessionDetails = sessionDetails.replace('{mes}', variables.mes);
        }
        if (variables.totalSessions !== undefined) {
            sessionDetails = sessionDetails.replace('{totalSessions}', variables.totalSessions.toString());
        }
        if (variables.sessionDatesList) {
            sessionDetails = sessionDetails.replace('{sessionDatesList}', variables.sessionDatesList);
        }
        if (variables.lastSessionDate) {
            sessionDetails = sessionDetails.replace('{lastSessionDate}', variables.lastSessionDate);
        }
        if (variables.totalAmount) {
            sessionDetails = sessionDetails.replace('{totalAmount}', variables.totalAmount);
        }
        if (variables.pendingAmount) {
            sessionDetails = sessionDetails.replace('{pendingAmount}', variables.pendingAmount);
        }

        sections.push('', sessionDetails);
    }

    if (template.paymentMethods) {
        sections.push('', template.paymentMethods);
    }

    if (template.requestMessage) {
        sections.push('', template.requestMessage);
    }

    if (template.closing) {
        sections.push('', template.closing);
    }

    return sections.filter(section => section !== undefined).join('\n');
};

// Status mappings for different modes (existing code...)
export const getStatusMapping = () => {
    if (isSimpleMode()) {
        return {
            'pending': 'pending',
            'aguardando_pagamento': 'pending',
            'pendente': 'pending',
            'paid': 'paid'
        };
    } else {
        return {
            'pending': 'pending',
            'aguardando_pagamento': 'aguardando_pagamento',
            'pendente': 'pendente',
            'paid': 'paid'
        };
    }
};

// Get available status options for dropdowns (existing code...)
export const getStatusOptions = () => {
    if (isSimpleMode()) {
        return [
            { label: '○ Pendente', value: 'pending', icon: '○' },
            { label: '✓ Pago', value: 'paid', icon: '✓' }
        ];
    } else {
        return [
            { label: '○ Não Cobrado', value: 'pending', icon: '○' },
            { label: '⏳ Aguardando', value: 'aguardando_pagamento', icon: '⏳' },
            { label: '⚠️ Pendente', value: 'pendente', icon: '⚠️' },
            { label: '✓ Pago', value: 'paid', icon: '✓' }
        ];
    }
};

// Get display label for status (existing code...)
export const getStatusDisplayLabel = (status: string) => {
    if (isSimpleMode()) {
        const mapping = getStatusMapping();
        const mappedStatus = mapping[status as keyof typeof mapping];
        return mappedStatus === 'paid' ? 'Pago' : 'Pendente';
    } else {
        switch (status) {
            case 'paid': return 'Pago';
            case 'aguardando_pagamento': return 'Aguardando';
            case 'pendente': return 'Pendente';
            case 'pending':
            default: return 'Não Cobrado';
        }
    }
};