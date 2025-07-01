// clinic-api/src/services/onboarding.ts

import pool from "../config/database.js";
import { googleCalendarService } from "./google-calendar.js";
import {
  ImportedCalendarEvent,
  PatientMatchingCandidate,
  CalendarImportRequest,
  CalendarImportResponse,
  GoogleCalendarEvent
} from "../types/index.js";

export class OnboardingService {

  // ============================================================================
  // CALENDAR IMPORT WITH SMART FILTERING
  // ============================================================================

  async importCalendarEvents(request: CalendarImportRequest): Promise<CalendarImportResponse> {
    const { therapistEmail, lookbackMonths = 6, includeAllEvents = false } = request;

    try {
      // Get therapist ID and calendar
      const therapistResult = await pool.query(
        "SELECT id, google_calendar_id FROM therapists WHERE email = $1",
        [therapistEmail]
      );

      if (therapistResult.rows.length === 0) {
        throw new Error("Therapist not found");
      }

      const { id: therapistId, google_calendar_id: calendarId } = therapistResult.rows[0];

      if (!calendarId) {
        throw new Error("Therapist has no calendar configured");
      }

      // Calculate date range for import
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - lookbackMonths);

      console.log(`Importing calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Get events from Google Calendar
      const googleEvents = await googleCalendarService.getEventsInRange(
        calendarId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log(`Found ${googleEvents.length} total events in calendar`);

      // Filter events (either all events or just potential therapy sessions)
      const filteredEvents = includeAllEvents
        ? googleEvents
        : googleEvents.filter(event => this.isPotentialTherapySession(event));

      console.log(`Filtered to ${filteredEvents.length} potential therapy sessions`);

      // Store imported events and generate patient candidates
      const imported_events: ImportedCalendarEvent[] = [];
      const patient_candidates: PatientMatchingCandidate[] = [];
      const events_by_month: Record<string, number> = {};
      const confidence_distribution: Record<string, number> = { high: 0, medium: 0, low: 0 };

      for (const googleEvent of filteredEvents) {
        // Store the imported event
        const importResult = await pool.query(
          `INSERT INTO imported_calendar_events 
           (therapist_id, google_event_id, summary, description, start_time, end_time, attendees, confidence_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            therapistId,
            googleEvent.id,
            googleEvent.summary || 'Sem título',
            googleEvent.description || null,
            new Date(googleEvent.start?.dateTime || googleEvent.start?.date || ''),
            new Date(googleEvent.end?.dateTime || googleEvent.end?.date || ''),
            JSON.stringify(googleEvent.attendees?.map((a: any) => a.email) || []),
            this.calculateEventConfidence(googleEvent)
          ]
        );

        const importedEvent = importResult.rows[0] as ImportedCalendarEvent;
        imported_events.push(importedEvent);

        // Track monthly distribution
        const monthKey = new Date(importedEvent.start_time).toISOString().substring(0, 7); // YYYY-MM
        events_by_month[monthKey] = (events_by_month[monthKey] || 0) + 1;

        // Generate patient candidates from this event
        const candidates = await this.extractPatientCandidates(therapistId, importedEvent);
        patient_candidates.push(...candidates);

        // Track confidence distribution
        const confidence = importedEvent.confidence_score || 0;
        if (confidence >= 80) confidence_distribution.high++;
        else if (confidence >= 50) confidence_distribution.medium++;
        else confidence_distribution.low++;
      }

      // Remove duplicate patient candidates (same name/email)
      const uniqueCandidates = this.deduplicatePatientCandidates(patient_candidates);

      const response: CalendarImportResponse = {
        imported_events,
        total_events: filteredEvents.length,
        potential_therapy_sessions: filteredEvents.length,
        patient_candidates: uniqueCandidates,
        import_summary: {
          date_range: {
            start: startDate,
            end: endDate
          },
          events_by_month,
          confidence_distribution
        }
      };

      console.log(`Import complete: ${imported_events.length} events, ${uniqueCandidates.length} patient candidates`);
      return response;

    } catch (error) {
      console.error("Calendar import failed:", error);
      throw error;
    }
  }

  // ============================================================================
  // SMART PATIENT MATCHING
  // ============================================================================

  private async extractPatientCandidates(
    therapistId: number,
    event: ImportedCalendarEvent
  ): Promise<PatientMatchingCandidate[]> {
    const candidates: PatientMatchingCandidate[] = [];

    // Method 1: Extract from event summary (e.g., "Sessão - Maria Silva")
    const nameFromSummary = this.extractNameFromSummary(event.summary);
    if (nameFromSummary) {
      const summaryCandidate = await pool.query(
        `INSERT INTO patient_matching_candidates 
         (therapist_id, imported_event_id, extracted_name, extraction_method, confidence_score, requires_new_patient)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          therapistId,
          event.id,
          nameFromSummary,
          'summary_parsing',
          85, // High confidence for structured summaries
          true
        ]
      );
      candidates.push(summaryCandidate.rows[0]);
    }

    // Method 2: Extract from attendee emails
    if (event.attendees && Array.isArray(event.attendees)) {
      for (const email of event.attendees) {
        if (email && email.includes('@') && !email.includes('calendar.google.com')) {
          const attendeeCandidate = await pool.query(
            `INSERT INTO patient_matching_candidates 
             (therapist_id, imported_event_id, extracted_name, extracted_email, extraction_method, confidence_score, requires_new_patient)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              therapistId,
              event.id,
              this.extractNameFromEmail(email),
              email,
              'attendee_email',
              90, // Very high confidence for email attendees
              true
            ]
          );
          candidates.push(attendeeCandidate.rows[0]);
        }
      }
    }

    // Method 3: Extract from description (if present)
    if (event.description) {
      const nameFromDescription = this.extractNameFromDescription(event.description);
      if (nameFromDescription) {
        const descriptionCandidate = await pool.query(
          `INSERT INTO patient_matching_candidates 
           (therapist_id, imported_event_id, extracted_name, extraction_method, confidence_score, requires_new_patient)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            therapistId,
            event.id,
            nameFromDescription,
            'description_parsing',
            60, // Medium confidence for description parsing
            true
          ]
        );
        candidates.push(descriptionCandidate.rows[0]);
      }
    }

    return candidates;
  }

  // ============================================================================
  // PATTERN DETECTION & SMART FILTERING
  // ============================================================================

  private isPotentialTherapySession(event: GoogleCalendarEvent): boolean {
    const summary = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();

    // Keywords that suggest therapy sessions
    const therapyKeywords = [
      'sessão', 'sesão', 'sessao', 'terapia', 'consulta', 'atendimento',
      'session', 'therapy', 'appointment', 'meeting', 'cliente', 'paciente'
    ];

    // Check for therapy keywords
    const hasTherapyKeywords = therapyKeywords.some(keyword =>
      summary.includes(keyword) || description.includes(keyword)
    );

    // Check for structured titles like "Sessão - Nome" or "Consulta - Nome"
    const hasStructuredTitle = /^(sessão|sesão|sessao|terapia|consulta|atendimento)\s*[-:]\s*.+/i.test(summary);

    // Check for personal names (simple heuristic: title contains a proper name)
    const hasPersonalName = /\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+/i.test(summary);

    // Check for attendees (suggests it's a meeting/session)
    const hasAttendees = event.attendees && event.attendees.length > 0;

    // Duration check (therapy sessions are typically 30-120 minutes)
    const duration = this.calculateEventDuration(event);
    const isReasonableDuration = duration >= 30 && duration <= 180;

    // Score the event
    let score = 0;
    if (hasTherapyKeywords) score += 40;
    if (hasStructuredTitle) score += 30;
    if (hasPersonalName) score += 20;
    if (hasAttendees) score += 15;
    if (isReasonableDuration) score += 10;

    // Threshold for considering it a potential therapy session
    return score >= 50;
  }

  private calculateEventConfidence(event: GoogleCalendarEvent): number {
    let confidence = 0;

    const summary = (event.summary || '').toLowerCase();

    // High confidence indicators
    if (summary.includes('sessão') || summary.includes('terapia')) confidence += 40;
    if (event.attendees && event.attendees.length > 0) confidence += 30;
    if (summary.match(/^(sessão|terapia|consulta)\s*[-:]\s*.+/i)) confidence += 20;

    // Medium confidence indicators  
    if (summary.includes('consulta') || summary.includes('atendimento')) confidence += 15;
    if (this.calculateEventDuration(event) >= 45) confidence += 10;

    return Math.min(confidence, 100);
  }

  private calculateEventDuration(event: GoogleCalendarEvent): number {
    try {
      const start = new Date(event.start?.dateTime || event.start?.date || '');
      const end = new Date(event.end?.dateTime || event.end?.date || '');
      return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // NAME EXTRACTION UTILITIES
  // ============================================================================

  private extractNameFromSummary(summary: string): string | null {
    // Pattern: "Sessão - Maria Silva" or "Terapia: João Santos"
    const patterns = [
      /^(sessão|sesão|sessao|terapia|consulta|atendimento)\s*[-:]\s*(.+)$/i,
      /^(.+)\s*[-:]\s*(sessão|sesão|sessao|terapia|consulta)$/i
    ];

    for (const pattern of patterns) {
      const match = summary.match(pattern);
      if (match) {
        const extractedName = match[2].trim();
        return this.cleanExtractedName(extractedName);
      }
    }

    return null;
  }

  private extractNameFromEmail(email: string): string {
    // Extract name part before @ and clean it up
    const localPart = email.split('@')[0];

    // Convert common email formats to names
    // john.doe -> John Doe
    // maria_silva -> Maria Silva
    const name = localPart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return this.cleanExtractedName(name);
  }

  private extractNameFromDescription(description: string): string | null {
    // Look for "Paciente: Nome" or "Cliente: Nome" patterns
    const patterns = [
      /(?:paciente|cliente|patient|client):\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]+)/i,
      /\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)\b/
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return this.cleanExtractedName(match[1]);
      }
    }

    return null;
  }

  private cleanExtractedName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // ============================================================================
  // DEDUPLICATION & CLEANUP
  // ============================================================================

  private deduplicatePatientCandidates(candidates: PatientMatchingCandidate[]): PatientMatchingCandidate[] {
    const uniqueMap = new Map<string, PatientMatchingCandidate>();

    for (const candidate of candidates) {
      // Create a key based on name and email (if available)
      const key = `${candidate.extracted_name.toLowerCase()}|${candidate.extracted_email || ''}`;

      // Keep the candidate with highest confidence score
      if (!uniqueMap.has(key) || (uniqueMap.get(key)?.confidence_score || 0) < candidate.confidence_score) {
        uniqueMap.set(key, candidate);
      }
    }

    return Array.from(uniqueMap.values());
  }

  // ============================================================================
  // MATCHING EXISTING PATIENTS
  // ============================================================================

  async matchCandidatesToExistingPatients(therapistId: number): Promise<void> {
    try {
      // Get all unmatched candidates for this therapist
      const candidatesResult = await pool.query(
        `SELECT * FROM patient_matching_candidates 
         WHERE therapist_id = $1 AND matched_patient_id IS NULL`,
        [therapistId]
      );

      // Get all existing patients for this therapist
      const patientsResult = await pool.query(
        `SELECT id, nome, email FROM patients WHERE therapist_id = $1`,
        [therapistId]
      );

      const candidates = candidatesResult.rows;
      const existingPatients = patientsResult.rows;

      for (const candidate of candidates) {
        // Try to match by email first (most reliable)
        if (candidate.extracted_email) {
          const emailMatch = existingPatients.find(p => p.email === candidate.extracted_email);
          if (emailMatch) {
            await pool.query(
              `UPDATE patient_matching_candidates 
               SET matched_patient_id = $1, requires_new_patient = false 
               WHERE id = $2`,
              [emailMatch.id, candidate.id]
            );
            continue;
          }
        }

        // Try to match by name similarity
        const nameMatch = existingPatients.find(p =>
          this.calculateNameSimilarity(candidate.extracted_name, p.nome) > 0.8
        );

        if (nameMatch) {
          await pool.query(
            `UPDATE patient_matching_candidates 
             SET matched_patient_id = $1, requires_new_patient = false 
             WHERE id = $2`,
            [nameMatch.id, candidate.id]
          );
        }
      }

      console.log(`Matched candidates to existing patients for therapist ${therapistId}`);
    } catch (error) {
      console.error("Error matching candidates to existing patients:", error);
      throw error;
    }
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple similarity calculation (you could use a more sophisticated algorithm)
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    if (n1 === n2) return 1.0;

    // Check if one name contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;

    // Simple word overlap check
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  // ============================================================================
  // ONBOARDING PROGRESS TRACKING
  // ============================================================================

  async updateOnboardingProgress(therapistEmail: string, step: string, data?: any): Promise<void> {
    try {
      // This will call the existing endpoint we already created
      console.log(`Updating onboarding progress: ${therapistEmail} -> ${step}`);

      // You can add additional logic here if needed for the onboarding workflow
      // For now, this is mainly a placeholder that could trigger other services

    } catch (error) {
      console.error("Error updating onboarding progress:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const onboardingService = new OnboardingService();