-- clinic-api/db/002_enhanced_onboarding_schema.sql
-- Enhanced schema for therapist onboarding with dual date system
-- Based on current schema analysis - only adds missing features

-- Add billing and onboarding fields to existing therapists table
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly'; -- 'per_session', 'weekly', 'monthly'
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS default_session_price DECIMAL(10,2);
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add dual date system and enhanced fields to existing patients table
-- CRITICAL: Two separate date fields for different purposes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS therapy_start_date DATE; -- Historical (optional) - when therapy actually began
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lv_notas_billing_start_date DATE; -- LV Notas billing (required) - when to start counting sessions
ALTER TABLE patients ADD COLUMN IF NOT EXISTS session_price DECIMAL(10,2); -- Override therapist default
ALTER TABLE patients ADD COLUMN IF NOT EXISTS recurring_pattern VARCHAR(50); -- 'weekly', 'bi-weekly', 'monthly', etc.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes TEXT; -- General patient notes

-- Add billing-related fields to existing sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT true; -- Whether this session counts for billing
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20); -- Which billing period this belongs to
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_price DECIMAL(10,2); -- Price for this specific session
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_during_onboarding BOOLEAN DEFAULT false; -- Was this session created during import?
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(255); -- Reference to import batch

-- Create onboarding progress tracking table
CREATE TABLE IF NOT EXISTS therapist_onboarding (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL, -- 'calendar_selected', 'events_imported', 'patients_created', 'appointments_linked', 'billing_configured', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data JSONB, -- Store step-specific data like calendar_id, event_count, etc.
    notes TEXT, -- Any additional notes about the step
    UNIQUE(therapist_id, step) -- One record per step per therapist
);

-- Create imported calendar events table for onboarding
CREATE TABLE IF NOT EXISTS imported_calendar_events (
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

-- Create patient matching candidates table for onboarding
CREATE TABLE IF NOT EXISTS patient_matching_candidates (
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

-- Create recurring session templates table
CREATE TABLE IF NOT EXISTS recurring_session_templates (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_therapist_billing ON patients(therapist_id, lv_notas_billing_start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_billable ON sessions(therapist_id, billable, date);
CREATE INDEX IF NOT EXISTS idx_sessions_billing_period ON sessions(therapist_id, billing_period);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_imported_events_therapist_batch ON imported_calendar_events(therapist_id, import_batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_events_therapy_sessions ON imported_calendar_events(therapist_id, is_therapy_session);
CREATE INDEX IF NOT EXISTS idx_imported_events_google_id ON imported_calendar_events(google_event_id);

CREATE INDEX IF NOT EXISTS idx_matching_candidates_therapist_batch ON patient_matching_candidates(therapist_id, import_batch_id);
CREATE INDEX IF NOT EXISTS idx_matching_candidates_name ON patient_matching_candidates(extracted_name);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_therapist_patient ON recurring_session_templates(therapist_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_status ON recurring_session_templates(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_schedule ON recurring_session_templates(day_of_week, start_time);

-- Create view for billable sessions (sessions after LV Notas billing start date)
CREATE OR REPLACE VIEW billable_sessions AS
SELECT 
    s.*,
    p.lv_notas_billing_start_date,
    CASE 
        WHEN s.date::date >= p.lv_notas_billing_start_date THEN true 
        ELSE false 
    END as counts_for_billing
FROM sessions s
JOIN patients p ON s.patient_id = p.id
WHERE s.billable = true;

-- Create view for onboarding progress
CREATE OR REPLACE VIEW therapist_onboarding_progress AS
SELECT 
    t.id as therapist_id,
    t.email,
    t.onboarding_completed,
    t.onboarding_started_at,
    t.onboarding_completed_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'step', to.step,
                'completed_at', to.completed_at,
                'data', to.data,
                'notes', to.notes
            ) ORDER BY to.completed_at
        ) FILTER (WHERE to.step IS NOT NULL), 
        '[]'::json
    ) as completed_steps,
    CASE 
        WHEN t.onboarding_completed THEN 'completed'
        WHEN COUNT(to.step) = 0 THEN 'not_started'
        ELSE 'in_progress'
    END as status
FROM therapists t
LEFT JOIN therapist_onboarding to ON t.id = to.therapist_id
GROUP BY t.id, t.email, t.onboarding_completed, t.onboarding_started_at, t.onboarding_completed_at;

-- Create helper function to calculate billing sessions count
CREATE OR REPLACE FUNCTION get_billing_sessions_count(
    p_therapist_id INTEGER,
    p_patient_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO session_count
    FROM billable_sessions bs
    WHERE bs.therapist_id = p_therapist_id
        AND bs.patient_id = p_patient_id
        AND bs.counts_for_billing = true
        AND bs.status = 'compareceu'
        AND (p_start_date IS NULL OR bs.date::date >= p_start_date)
        AND (p_end_date IS NULL OR bs.date::date <= p_end_date);
    
    RETURN COALESCE(session_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to extract patient name from event summary
CREATE OR REPLACE FUNCTION extract_patient_name_from_summary(summary TEXT) RETURNS TEXT AS $$
BEGIN
    -- Handle "Sessão - Patient Name" format
    IF summary ~* '^sessão\s*-\s*(.+)$' THEN
        RETURN TRIM(REGEXP_REPLACE(summary, '^sessão\s*-\s*', '', 'i'));
    END IF;
    
    -- Handle "Patient Name - Sessão" format
    IF summary ~* '^(.+)\s*-\s*sessão$' THEN
        RETURN TRIM(REGEXP_REPLACE(summary, '\s*-\s*sessão$', '', 'i'));
    END IF;
    
    -- Handle just patient name (if marked as therapy session)
    RETURN TRIM(summary);
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments to new columns
COMMENT ON COLUMN patients.therapy_start_date IS 'Historical date when therapy actually began (optional, for context only)';
COMMENT ON COLUMN patients.lv_notas_billing_start_date IS 'Date when LV Notas billing begins (required, affects billing calculations)';
COMMENT ON COLUMN sessions.billable IS 'Whether this session counts toward billing (based on billing start date)';
COMMENT ON COLUMN sessions.created_during_onboarding IS 'Was this session created during the onboarding import process';

-- Create a sample onboarding step for existing therapists (if any exist)
INSERT INTO therapist_onboarding (therapist_id, step, data, notes) 
SELECT 
    id, 
    'system_initialized', 
    JSON_BUILD_OBJECT('migration_version', '002', 'created_at', NOW()),
    'System initialized with enhanced onboarding schema'
FROM therapists
ON CONFLICT (therapist_id, step) DO NOTHING;