// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  email: string;
  telefone: string;
  cpf: string;
  endereco?: string;
  dataNascimento?: string;
  genero?: string;
  contatoEmergencia?: string;
  telefoneEmergencia?: string;
  sessionPrice?: number;
  therapyStartDate?: string;
  lvNotasBillingStartDate?: string;
  observacoes?: string;
}

export interface Session {
  message: any;
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
  step: 'welcome' | 'auth' | 'calendar-selection' | 'calendar' | 'success' | 'import-wizard' | 'addPatients';
  therapist?: Therapist;
  error?: string;
}

export * from './calendar-only';