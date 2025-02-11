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
