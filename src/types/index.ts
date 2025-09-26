// src/types/index.ts

export interface Patient {
  id?: string; // Optional for create operations
  name?: string; // For display (maps from 'nome')
  nome?: string; // For API requests
  email?: string;
  telefone?: string;
  cpf?: string;
  therapistEmail?: string; // For create operations
  sessionPrice?: number;
  therapyStartDate?: string;
  lvNotasBillingStartDate?: string;
  observacoes?: string;
  
  // Address fields
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoBairro?: string;
  enderecoCodigoMunicipio?: string;
  enderecoUf?: string;
  enderecoCep?: string;
  
  // Personal information fields
  dataNascimento?: string;
  genero?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
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
  incomeTaxRate?: number;
}

export interface OnboardingState {
  step: 'welcome' | 'auth' | 'calendar-selection' | 'calendar' | 'success' | 'import-wizard' | 'addPatients';
  therapist?: Therapist;
  error?: string;
}

export * from './calendar-only';