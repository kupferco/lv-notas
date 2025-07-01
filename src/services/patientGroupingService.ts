// src/services/patientGroupingService.ts
import type { CalendarEvent } from '../types/onboarding';

export interface GroupedPatient {
  id: string;
  name: string;
  suggestedEmail: string;
  sessionCount: number;
  firstSessionDate: string;
  lastSessionDate: string;
  sampleEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
  estimatedPhone: string;
}

export class PatientGroupingService {
  
  /**
   * Groups calendar events by patient name, creating one entry per unique patient
   * This reduces hundreds of recurring events to ~20 unique patients
   */
  static groupEventsByPatient(events: CalendarEvent[]): GroupedPatient[] {
    console.log(`📅 Processing ${events.length} calendar events...`);
    
    // Group events by normalized patient name
    const patientGroups = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      const patientName = this.extractPatientName(event.summary || '');
      const normalizedName = this.normalizePatientName(patientName);
      
      if (!patientGroups.has(normalizedName)) {
        patientGroups.set(normalizedName, []);
      }
      patientGroups.get(normalizedName)!.push(event);
    });

    // Convert groups to GroupedPatient objects
    const groupedPatients: GroupedPatient[] = [];
    
    patientGroups.forEach((eventList, normalizedName) => {
      // Sort events by date
      const sortedEvents = eventList.sort((a, b) => 
        new Date(a.start?.dateTime || a.start?.date || '').getTime() - 
        new Date(b.start?.dateTime || b.start?.date || '').getTime()
      );

      // Extract the cleanest patient name from all events
      const bestName = this.getBestPatientName(eventList);
      
      // Get suggested email from attendees
      const suggestedEmail = this.extractBestEmail(eventList);
      
      // Create grouped patient
      const groupedPatient: GroupedPatient = {
        id: this.generatePatientId(normalizedName),
        name: bestName,
        suggestedEmail,
        sessionCount: sortedEvents.length,
        firstSessionDate: sortedEvents[0]?.start?.dateTime || sortedEvents[0]?.start?.date || '',
        lastSessionDate: sortedEvents[sortedEvents.length - 1]?.start?.dateTime || sortedEvents[sortedEvents.length - 1]?.start?.date || '',
        sampleEvents: sortedEvents.slice(0, 3), // Show first 3 sessions as examples
        allEvents: sortedEvents,
        estimatedPhone: '' // Will be filled by user
      };

      groupedPatients.push(groupedPatient);
    });

    // Sort by session count (most sessions first) then by name
    groupedPatients.sort((a, b) => {
      if (b.sessionCount !== a.sessionCount) {
        return b.sessionCount - a.sessionCount;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`👥 Grouped into ${groupedPatients.length} unique patients`);
    
    return groupedPatients;
  }

  /**
   * Extract patient name from calendar event summary
   * Handles various formats: "Sessão - Maria Silva", "Maria Silva", "Terapia Maria", etc.
   */
  private static extractPatientName(summary: string): string {
    if (!summary) return 'Paciente Sem Nome';

    // Remove common therapy-related words and separators
    let cleaned = summary
      .toLowerCase()
      .replace(/(?:sessão|session|terapia|therapy|consulta|appointment|atendimento)/gi, '')
      .replace(/(?:com|with|de|do|da)/gi, '')
      .replace(/[-–—:;]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word
    cleaned = cleaned.replace(/\b\w/g, l => l.toUpperCase());
    
    return cleaned || 'Paciente';
  }

  /**
   * Normalize patient name for grouping (remove accents, lowercase, etc.)
   */
  private static normalizePatientName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get the best (cleanest) patient name from all events for this patient
   */
  private static getBestPatientName(events: CalendarEvent[]): string {
    const names = events
      .map(event => this.extractPatientName(event.summary || ''))
      .filter(name => name !== 'Paciente' && name !== 'Paciente Sem Nome');

    if (names.length === 0) return 'Paciente Sem Nome';

    // Return the longest name (likely most complete)
    return names.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  }

  /**
   * Extract the best email from event attendees
   */
  private static extractBestEmail(events: CalendarEvent[]): string {
    for (const event of events) {
      if (event.attendees && event.attendees.length > 0) {
        // Look for the first valid email from attendees
        const patientEmail = event.attendees.find(attendee => 
          attendee.email && this.isValidEmail(attendee.email)
        );
        
        if (patientEmail && patientEmail.email) {
          return patientEmail.email;
        }
      }
    }
    return '';
  }

  /**
   * Simple email validation
   */
  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Generate a unique ID for the patient
   */
  private static generatePatientId(normalizedName: string): string {
    return `patient_${normalizedName.replace(/\s+/g, '_')}_${Date.now()}`;
  }

  /**
   * Get session frequency analysis to help therapist understand patient patterns
   */
  static analyzeSessionFrequency(groupedPatient: GroupedPatient): {
    averageDaysBetween: number;
    suggestedFrequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
    weeklyPattern?: string;
  } {
    const events = groupedPatient.allEvents;
    if (events.length < 2) {
      return {
        averageDaysBetween: 0,
        suggestedFrequency: 'irregular'
      };
    }

    // Calculate days between sessions
    const daysBetween: number[] = [];
    for (let i = 1; i < events.length; i++) {
      const prevDate = new Date(events[i-1].start?.dateTime || events[i-1].start?.date || '');
      const currDate = new Date(events[i].start?.dateTime || events[i].start?.date || '');
      const days = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0 && days < 100) { // Filter out outliers
        daysBetween.push(days);
      }
    }

    if (daysBetween.length === 0) {
      return {
        averageDaysBetween: 0,
        suggestedFrequency: 'irregular'
      };
    }

    const averageDays = Math.round(daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length);

    // Determine frequency pattern
    let suggestedFrequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
    if (averageDays <= 9) {
      suggestedFrequency = 'weekly';
    } else if (averageDays <= 16) {
      suggestedFrequency = 'biweekly';
    } else if (averageDays <= 35) {
      suggestedFrequency = 'monthly';
    } else {
      suggestedFrequency = 'irregular';
    }

    // Analyze weekly pattern if weekly sessions
    let weeklyPattern: string | undefined;
    if (suggestedFrequency === 'weekly') {
      const dayOfWeekCounts = new Map<number, number>();
      events.forEach(event => {
        const date = new Date(event.start?.dateTime || event.start?.date || '');
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
      });

      const mostCommonDay = Array.from(dayOfWeekCounts.entries())
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      weeklyPattern = dayNames[mostCommonDay];
    }

    return {
      averageDaysBetween: averageDays,
      suggestedFrequency,
      weeklyPattern
    };
  }
}