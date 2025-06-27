// clinic-api/src/types/index.ts

// ============================================================================
// GOOGLE CALENDAR TYPES
// ============================================================================

export interface GoogleCalendarEvent {
  id: string;
  status: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: {
    email: string;
    responseStatus: string;
  }[];
  organizer?: {
    email: string;
  };
  creator?: {
    email: string;
  };
}

export interface CalendarEventProcessingResult {
  eventType: "new" | "update" | "cancel";
  sessionId: number | null;
  therapistId: number | null;
  patientId: number | null;
  error?: string;
}

// ============================================================================
// CORE DATABASE TYPES (With Dual Date System & Billing)
// ============================================================================

export interface Therapist {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  google_calendar_id?: string;
  // Billing fields
  billing_cycle: 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
  default_session_price: number;
  // Onboarding tracking
  onboarding_completed: boolean;
  onboarding_started_at?: Date;
  onboarding_completed_at?: Date;
  onboarding_current_step?: string;
  created_at: Date;
}

export interface Patient {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  nota: boolean;
  preco: number;
  therapist_id: number;
  // DUAL DATE SYSTEM (Critical Feature)
  therapy_start_date?: Date; // When therapy actually began (historical)
  lv_notas_billing_start_date: Date; // When LV Notas billing begins (REQUIRED)
  // Billing overrides
  billing_cycle_override?: 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
  session_price_override?: number;
  // Note: Recurring patterns handled by Google Calendar, not LV Notas
  created_at: Date;
}

export interface Session {
  id: number;
  date: Date;
  google_calendar_event_id?: string;
  patient_id: number;
  therapist_id: number;
  status: 'agendada' | 'compareceu' | 'cancelada';
  // Billing integration
  counts_for_billing: boolean; // Only sessions after billing start date
  billing_period_id?: number;
  session_price?: number; // Price at time of session
  created_at: Date;
}

// ============================================================================
// ONBOARDING SYSTEM TYPES
// ============================================================================

export interface TherapistOnboarding {
  id: number;
  therapist_id: number;
  step: 'calendar_selection' | 'event_import' | 'patient_creation' | 'appointment_linking' | 'dual_date_setup' | 'billing_configuration' | 'completed';
  completed: boolean;
  completed_at?: Date;
  data?: Record<string, any>; // Step-specific data
  created_at: Date;
  updated_at: Date;
}

export interface ImportedCalendarEvent {
  id: number;
  therapist_id: number;
  google_event_id: string;
  summary: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  attendees?: string[]; // Email addresses
  is_therapy_session?: boolean; // Marked by therapist
  confidence_score?: number; // AI matching confidence (0-100)
  created_at: Date;
}

export interface PatientMatchingCandidate {
  id: number;
  therapist_id: number;
  imported_event_id: number;
  extracted_name: string;
  extracted_email?: string;
  extraction_method: 'summary_parsing' | 'attendee_email' | 'description_parsing' | 'manual';
  confidence_score: number; // 0-100
  matched_patient_id?: number; // If matched to existing patient
  requires_new_patient: boolean;
  created_at: Date;
}

export interface RecurringSessionTemplate {
  id: number;
  therapist_id: number;
  patient_id?: number; // If matched to patient
  pattern_type: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number; // 0-6
  time_of_day: string; // HH:MM
  confidence_score: number; // Pattern detection confidence
  sample_event_ids: number[]; // Example events that show this pattern
  created_at: Date;
}

// ============================================================================
// BILLING SYSTEM TYPES
// ============================================================================

export interface TherapistBillingHistory {
  id: number;
  therapist_id: number;
  billing_cycle: 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
  default_session_price: number;
  effective_date: Date;
  reason?: string;
  changed_by: string; // Email of who made the change
  created_at: Date;
}

export interface PatientBillingHistory {
  id: number;
  patient_id: number;
  billing_cycle_override?: 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
  session_price_override?: number;
  effective_date: Date;
  reason?: string;
  changed_by: string;
  created_at: Date;
}

export interface BillingPeriod {
  id: number;
  therapist_id: number;
  patient_id?: number; // Null for therapist-wide periods
  period_type: 'monthly' | 'weekly' | 'per_session';
  start_date: Date;
  end_date: Date;
  total_sessions: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_generated_at?: Date;
  payment_received_at?: Date;
  created_at: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface OnboardingStatusResponse {
  therapist: Therapist;
  onboarding_steps: TherapistOnboarding[];
  current_step: string;
  progress_percentage: number;
  next_step?: string;
  can_complete: boolean;
}

export interface CalendarImportRequest {
  therapistEmail: string;
  lookbackMonths: number; // How far back to import (default 6)
  includeAllEvents?: boolean; // Or just potential therapy sessions
}

export interface CalendarImportResponse {
  imported_events: ImportedCalendarEvent[];
  total_events: number;
  potential_therapy_sessions: number;
  patient_candidates: PatientMatchingCandidate[];
  import_summary: {
    date_range: {
      start: Date;
      end: Date;
    };
    events_by_month: Record<string, number>;
    confidence_distribution: Record<string, number>;
  };
}

export interface BulkPatientCreateRequest {
  therapistEmail: string;
  patients: Array<{
    nome: string;
    email?: string;
    telefone?: string;
    therapy_start_date?: Date; // Historical start
    lv_notas_billing_start_date: Date; // Billing start (REQUIRED)
    candidate_id?: number; // If from matching candidate
  }>;
}

export interface BillingCycleChangeRequest {
  therapistEmail: string;
  patientId?: number; // If null, changes therapist default
  billingCycle: 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
  sessionPrice: number;
  effectiveDate: Date;
  reason?: string;
}

// ============================================================================
// DATABASE VIEW TYPES (Matching your SQL views)
// ============================================================================

export interface BillableSessionsView {
  session_id: number;
  patient_id: number;
  patient_name: string;
  therapist_id: number;
  session_date: Date;
  session_status: string;
  session_price: number;
  billing_cycle: string;
  counts_for_billing: boolean;
  billing_period_id?: number;
}

export interface CurrentBillingSettingsView {
  patient_id: number;
  patient_name: string;
  therapist_id: number;
  current_billing_cycle: string;
  current_session_price: number;
  therapy_start_date?: Date;
  lv_notas_billing_start_date: Date;
  total_billable_sessions: number;
  last_session_date?: Date;
}

// ============================================================================
// UTILITY TYPES & TYPE GUARDS
// ============================================================================

export type BillingCycle = 'monthly' | 'weekly' | 'per_session' | 'ad_hoc';
export type OnboardingStep = 'calendar_selection' | 'event_import' | 'patient_creation' | 'appointment_linking' | 'dual_date_setup' | 'billing_configuration' | 'completed';
export type SessionStatus = 'agendada' | 'compareceu' | 'cancelada';

// Type guards for runtime validation
export function isTherapist(obj: any): obj is Therapist {
  return obj && 
         typeof obj.id === 'number' && 
         typeof obj.nome === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.billing_cycle === 'string' &&
         typeof obj.default_session_price === 'number';
}

export function isPatient(obj: any): obj is Patient {
  return obj && 
         typeof obj.id === 'number' && 
         typeof obj.nome === 'string' &&
         obj.lv_notas_billing_start_date instanceof Date;
}

export function isBillingCycle(cycle: string): cycle is BillingCycle {
  return ['monthly', 'weekly', 'per_session', 'ad_hoc'].includes(cycle);
}

export function isOnboardingStep(step: string): step is OnboardingStep {
  return ['calendar_selection', 'event_import', 'patient_creation', 'appointment_linking', 'dual_date_setup', 'billing_configuration', 'completed'].includes(step);
}