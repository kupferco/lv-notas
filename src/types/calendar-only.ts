// src/types/calendar-only.ts

// Calendar-only session interface (extends your existing Session)
export interface CalendarSession {
  id: string; // Google Calendar event ID
  patientId: number | null;
  patientName: string;
  patientEmail: string | null;
  date: Date;
  status: 'agendada' | 'compareceu' | 'cancelada';
  googleEventId: string;
  isFromCalendar: boolean; // Always true for calendar-only sessions
  paymentStatus?: string; // Optional payment info if linked to billing
  sessionPrice?: number; // In cents
}

// Monthly billing period interface
export interface BillingPeriod {
  id: number;
  therapistId: number;
  patientId: number;
  billingYear: number;
  billingMonth: number;
  sessionCount: number;
  totalAmount: number; // in cents
  sessionSnapshots: SessionSnapshot[];
  processedAt: Date;
  processedBy: string;
  status: 'processed' | 'paid' | 'void';
  canBeVoided: boolean;
}

// Immutable session snapshot for billing periods
export interface SessionSnapshot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  googleEventId: string;
  patientName: string;
  duration?: number;
  eventTitle?: string;
}

// Monthly billing summary interface
export interface BillingSummary {
  patientName: string;
  patientId: number;
  sessionCount: number;
  totalAmount: number; // in cents
  hasPayment: boolean;
  canProcess: boolean; // Can process charges for this month
  status: 'can_process' | 'processed' | 'paid' | 'void';
  billingPeriodId?: number;
}

// Monthly billing API request/response types
export interface ProcessChargesRequest {
  therapistEmail: string;
  patientId: number;
  year: number;
  month: number;
}

export interface ProcessChargesResponse {
  message: string;
  billingPeriod: BillingPeriod;
}

export interface MonthlyBillingOverviewResponse {
  year: number;
  month: number;
  summary: BillingSummary[];
}

// Payment recording interfaces for billing periods
export interface BillingPeriodPayment {
  id: number;
  billingPeriodId: number;
  amount: number; // in cents
  paymentMethod: 'pix' | 'transferencia' | 'dinheiro' | 'cartao';
  paymentDate: string; // YYYY-MM-DD
  referenceNumber?: string;
  createdAt: Date;
}

export interface RecordPaymentRequest {
  amount: number; // in cents
  paymentMethod: 'pix' | 'transferencia' | 'dinheiro' | 'cartao';
  paymentDate: string; // YYYY-MM-DD
  therapistEmail: string;
  referenceNumber?: string;
}

// Calendar-only API endpoint types
export interface CalendarOnlyPatientsRequest {
  therapistEmail: string;
  startDate?: string;
  endDate?: string;
}

export interface CalendarOnlyPatientResponse {
  patientId: number;
  patientName: string;
  sessions: CalendarSession[];
  totalSessions: number;
  billingStartDate?: string; // Patient's lv_notas_billing_start_date
}

export interface CalendarOnlySessionsRequest {
  therapistEmail: string;
  autoCheckIn?: boolean; // Include past scheduled sessions
  startDate?: string;
  endDate?: string;
}

// Enhanced patient interface for calendar-only mode
export interface CalendarOnlyPatient {
  id: number;
  name: string;
  email: string;
  telefone: string;
  lvNotasBillingStartDate: string; // Critical for calendar-only filtering
  sessionPrice?: number; // in cents
  therapyStartDate?: string;
  observacoes?: string;
  // Calendar-specific fields
  calendarSessions?: CalendarSession[];
  totalCalendarSessions?: number;
  activeBillingPeriod?: BillingPeriod;
}

// Google Calendar event structure (from your existing calendar integration)
export interface GoogleCalendarEvent {
  id: string;
  status: 'confirmed' | 'cancelled';
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
  organizer?: {
    email: string;
    displayName?: string;
  };
  creator?: {
    email: string;
    displayName?: string;
  };
}

// Monthly billing workflow types
export interface MonthlyBillingWorkflow {
  currentStep: 'overview' | 'processing' | 'payment' | 'complete';
  selectedYear: number;
  selectedMonth: number;
  selectedPatient?: CalendarOnlyPatient;
  processingBillingPeriod?: BillingPeriod;
  error?: string;
}

// Calendar-only settings interface (extends your existing settings)
export interface CalendarOnlySettings {
  calendarWritesEnabled: boolean; // Should always be false for calendar-only mode
  monthlyBillingEnabled: boolean;
  autoSessionFilteringEnabled: boolean; // Use billing start dates
  defaultSessionDuration: number; // minutes
  defaultCurrency: 'BRL';
  timezone: 'America/Sao_Paulo';
}

// Error types for calendar-only operations
export interface CalendarOnlyError {
  type: 'calendar_access' | 'billing_period' | 'payment_conflict' | 'validation';
  message: string;
  details?: any;
}

// Utility types for calendar-only migration
export type CalendarOnlyMode = 'enabled' | 'disabled';
export type BillingPeriodStatus = 'processed' | 'paid' | 'void';
export type PaymentMethod = 'pix' | 'transferencia' | 'dinheiro' | 'cartao';

// Migration compatibility types (to ensure smooth transition)
export interface LegacySessionCompat extends CalendarSession {
  // Legacy session fields for backward compatibility
  patient_id: string;
  therapist_id?: string;
  created_at?: string;
  google_calendar_event_id?: string;
}

// API response wrapper for calendar-only endpoints
export interface CalendarOnlyApiResponse<T> {
  data: T;
  metadata: {
    mode: 'calendar-only';
    timestamp: string;
    calendarWritesEnabled: boolean;
    therapistEmail: string;
  };
  error?: CalendarOnlyError;
}