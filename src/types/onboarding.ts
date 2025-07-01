// src/types/onboarding.ts

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    status?: string;
    creator?: {
        email?: string;
        displayName?: string;
    };
}

export interface SessionData {
    date: string;
    googleEventId: string;
    status: 'agendada' | 'compareceu' | 'cancelada';
}

export interface PatientData {
    name: string;
    email: string;
    phone: string;
    sessionPrice: number; // in cents (R$ 300,00 = 30000)
    therapyStartDate?: string; // Optional historical start date (therapy_start_date)
    lvNotasBillingStartDate: string; // Required LV Notas billing start (lv_notas_billing_start_date)
    sessions: SessionData[];
    originalEvents: CalendarEvent[]; // Keep reference to original events
}

export interface ImportStats {
    totalEvents: number;
    patientsCreated: number;
    sessionsCreated: number;
    skipped: number;
}

export type WizardStep = 'loading' | 'settings' | 'importing' | 'summary';

export interface WizardState {
    step: WizardStep;
    defaultSessionPrice: number; // in cents
    defaultTrackingStartDate: string; // Add this line
    events: CalendarEvent[];
    processedPatients: PatientData[];
    currentEventIndex: number;
    importStats: ImportStats;
}

export interface EventProcessingState {
    patientName: string;
    email: string;
    phone: string;
    sessionPrice: number;
    therapyStartDate?: string;
    lvNotasBillingStartDate: string; // Changed from chargingStartDate
    groupedSessions: SessionData[];
}

// Utility type for form validation
export interface ValidationErrors {
    patientName?: string;
    email?: string;
    phone?: string;
    sessionPrice?: string;
    lvNotasBillingStartDate?: string; // Changed from chargingStartDate
}