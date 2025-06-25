// src/types/index.ts

export interface Patient {
  telefone: string;
  email: string;
  id: number;  // This should be number to match runtime data
  name: string;
}

export interface Session {
  id: string;
  date: string;
  patient_id: string;  // Added: ID of the patient for this session
  therapist_id?: string;  // Added: ID of the therapist
  status: 'agendada' | 'compareceu' | 'cancelada';  // Added: Session status
  google_calendar_event_id?: string;  // Added: Google Calendar event ID
  created_at?: string;  // Added: When session was created
}

export interface CheckInForm {
  patientId: string;
  sessionId: string;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  phone?: string;
  googleCalendarId?: string;
}

export interface OnboardingState {
  step: 'welcome' | 'auth' | 'calendar-selection' | 'calendar' | 'success' | 'addPatients';
  therapist?: Therapist;
  error?: string;
}