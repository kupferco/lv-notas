export interface Patient {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  date: string;
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
  step: 'welcome' | 'auth' | 'calendar' | 'success' | 'addPatients';
  therapist?: Therapist;
  error?: string;
}

