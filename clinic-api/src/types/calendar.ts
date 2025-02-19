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
