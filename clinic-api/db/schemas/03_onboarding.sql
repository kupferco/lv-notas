-- clinic-api/db/schemas/03_onboarding.sql
-- Onboarding and calendar import system tables

-- =============================================================================
-- ONBOARDING TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS recurring_session_templates CASCADE;
DROP TABLE IF EXISTS patient_matching_candidates CASCADE;
DROP TABLE IF EXISTS imported_calendar_events CASCADE;
DROP TABLE IF EXISTS therapist_onboarding CASCADE;

-- Track onboarding progress step by step
CREATE TABLE therapist_onboarding (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL, -- 'calendar_selected', 'events_imported', 'patients_created', 'appointments_linked', 'billing_configured', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB, -- Store step-specific data like calendar_id, event_count, etc.
    notes TEXT, -- Any additional notes about the step
    UNIQUE(therapist_id, step) -- One record per step per therapist
);

-- Store imported calendar events during onboarding
CREATE TABLE imported_calendar_events (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    original_summary VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees_emails TEXT[], -- Array of attendee email addresses
    is_therapy_session BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurring_rule TEXT, -- RRULE for recurring events
    linked_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    matched_patient_name VARCHAR(255), -- Extracted patient name for matching
    processed BOOLEAN DEFAULT false,
    import_batch_id VARCHAR(255), -- Group events from same import session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Smart patient matching during onboarding
CREATE TABLE patient_matching_candidates (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    import_batch_id VARCHAR(255) NOT NULL,
    extracted_name VARCHAR(255) NOT NULL,
    name_variations TEXT[], -- Array of possible name variations
    email_addresses TEXT[], -- Array of email addresses found in events
    event_count INTEGER DEFAULT 0, -- How many events have this patient
    first_session_date DATE, -- Earliest session date for this patient
    latest_session_date DATE, -- Most recent session date
    suggested_therapy_start_date DATE, -- Suggested historical start date
    suggested_billing_start_date DATE, -- Suggested LV Notas billing start (default: today)
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0 matching confidence
    manual_review_needed BOOLEAN DEFAULT false,
    created_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recurring session templates detected from calendar history
CREATE TABLE recurring_session_templates (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    day_of_week INTEGER, -- 0 = Sunday, 1 = Monday, etc.
    start_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    frequency VARCHAR(20) DEFAULT 'weekly', -- 'weekly', 'bi-weekly', 'monthly'
    effective_from DATE NOT NULL, -- When this template becomes active
    effective_until DATE, -- Optional end date
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'ended'
    created_from_import BOOLEAN DEFAULT false, -- Was this detected during onboarding?
    import_batch_id VARCHAR(255), -- Reference to import session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR ONBOARDING TABLES
-- =============================================================================

CREATE INDEX idx_imported_events_therapist_batch ON imported_calendar_events(therapist_id, import_batch_id);
CREATE INDEX idx_imported_events_therapy_sessions ON imported_calendar_events(therapist_id, is_therapy_session);
CREATE INDEX idx_imported_events_google_id ON imported_calendar_events(google_event_id);
CREATE INDEX idx_matching_candidates_therapist_batch ON patient_matching_candidates(therapist_id, import_batch_id);
CREATE INDEX idx_matching_candidates_name ON patient_matching_candidates(extracted_name);
CREATE INDEX idx_recurring_templates_therapist_patient ON recurring_session_templates(therapist_id, patient_id);
CREATE INDEX idx_recurring_templates_status ON recurring_session_templates(therapist_id, status);
CREATE INDEX idx_recurring_templates_schedule ON recurring_session_templates(day_of_week, start_time);

-- =============================================================================
-- COMMENTS FOR ONBOARDING TABLES
-- =============================================================================

COMMENT ON TABLE therapist_onboarding IS 'Step-by-step tracking of therapist onboarding process';
COMMENT ON TABLE imported_calendar_events IS 'Calendar events imported during onboarding for processing';
COMMENT ON TABLE patient_matching_candidates IS 'Smart patient detection and matching from calendar events';
COMMENT ON TABLE recurring_session_templates IS 'Detected recurring appointment patterns for automation';
COMMENT ON COLUMN patient_matching_candidates.suggested_therapy_start_date IS 'AI-suggested historical therapy start date based on calendar history';
COMMENT ON COLUMN patient_matching_candidates.suggested_billing_start_date IS 'Default LV Notas billing start date (usually today)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Onboarding system tables created successfully!';
END $$;