-- clinic-api/db/complete_schema.sql
-- Complete LV Notas database schema with enhanced onboarding and billing
-- This file contains EVERYTHING needed to set up the database from scratch

-- Drop existing tables if they exist (for clean reinstall)
DROP VIEW IF EXISTS billing_change_history CASCADE;
DROP VIEW IF EXISTS current_billing_settings CASCADE;
DROP VIEW IF EXISTS therapist_onboarding_progress CASCADE;
DROP VIEW IF EXISTS billable_sessions CASCADE;

DROP TABLE IF EXISTS billing_periods CASCADE;
DROP TABLE IF EXISTS patient_billing_history CASCADE;
DROP TABLE IF EXISTS therapist_billing_history CASCADE;
DROP TABLE IF EXISTS recurring_session_templates CASCADE;
DROP TABLE IF EXISTS patient_matching_candidates CASCADE;
DROP TABLE IF EXISTS imported_calendar_events CASCADE;
DROP TABLE IF EXISTS therapist_onboarding CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_webhooks CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS therapists CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_billing_sessions_count(INTEGER, INTEGER, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS extract_patient_name_from_summary(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_therapist_billing_cycle(INTEGER, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_patient_billing_cycle(INTEGER, DATE) CASCADE;
DROP FUNCTION IF EXISTS change_therapist_billing_cycle(INTEGER, VARCHAR, DECIMAL, DATE, TEXT, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS change_patient_billing_cycle(INTEGER, VARCHAR, DECIMAL, DATE, TEXT, VARCHAR, TEXT) CASCADE;

-- Create custom types
CREATE TYPE session_status AS ENUM ('agendada', 'compareceu', 'cancelada');
CREATE TYPE event_type AS ENUM ('new', 'update', 'cancel');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Therapists with enhanced onboarding and billing features
CREATE TABLE therapists (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    google_calendar_id VARCHAR(255),
    -- Billing configuration
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'per_session', 'weekly', 'monthly', 'ad_hoc'
    default_session_price DECIMAL(10,2),
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_started_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients with dual date system and enhanced features
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    nota BOOLEAN DEFAULT false,
    preco DECIMAL(10,2),
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    -- CRITICAL: Dual date system
    therapy_start_date DATE, -- Historical (optional) - when therapy actually began
    lv_notas_billing_start_date DATE, -- LV Notas billing (required) - when to start counting sessions
    session_price DECIMAL(10,2), -- Override therapist default
    recurring_pattern VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', etc.
    notes TEXT, -- General patient notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions with enhanced billing tracking
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    google_calendar_event_id VARCHAR(255),
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    status session_status DEFAULT 'agendada',
    -- Billing fields
    billable BOOLEAN DEFAULT true, -- Whether this session counts for billing
    billing_period VARCHAR(20), -- Which billing period this belongs to
    session_price DECIMAL(10,2), -- Price for this specific session
    billing_cycle_used VARCHAR(20), -- What cycle was active when this session occurred
    -- Onboarding fields
    created_during_onboarding BOOLEAN DEFAULT false, -- Was this session created during import?
    import_batch_id VARCHAR(255), -- Reference to import batch
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar events (existing functionality)
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    event_type event_type NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    email VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins (existing functionality)
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) DEFAULT 'compareceu'
);

-- Calendar webhooks (existing functionality)
CREATE TABLE calendar_webhooks (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    expiration TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id)
);

-- =============================================================================
-- ONBOARDING TABLES
-- =============================================================================

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
-- BILLING HISTORY TABLES
-- =============================================================================

-- Complete history of therapist billing cycle changes
CREATE TABLE therapist_billing_history (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    billing_cycle VARCHAR(20) NOT NULL, -- 'per_session', 'weekly', 'monthly', 'ad_hoc'
    default_session_price DECIMAL(10,2),
    effective_from_date DATE NOT NULL, -- When this billing cycle starts
    effective_until_date DATE, -- When this billing cycle ends (NULL = current)
    reason_for_change TEXT, -- Why the change was made
    created_by VARCHAR(255), -- Who made the change (therapist email or 'system')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT -- Additional notes about the billing change
);

-- Patient-specific billing overrides with full history
CREATE TABLE patient_billing_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    billing_cycle VARCHAR(20) NOT NULL, -- Override for this specific patient
    session_price DECIMAL(10,2),
    effective_from_date DATE NOT NULL,
    effective_until_date DATE, -- NULL = current
    reason_for_change TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Actual billing periods and invoice tracking
CREATE TABLE billing_periods (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    billing_cycle VARCHAR(20) NOT NULL, -- What cycle was used for this period
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    billable_sessions INTEGER DEFAULT 0, -- Sessions that count for billing
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    invoice_generated BOOLEAN DEFAULT false,
    invoice_sent BOOLEAN DEFAULT false,
    invoice_paid BOOLEAN DEFAULT false,
    invoice_date DATE,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure no overlapping billing periods for same patient
    UNIQUE(therapist_id, patient_id, period_start_date, period_end_date)
);

-- Add billing period reference to sessions
ALTER TABLE sessions ADD COLUMN billing_period_id INTEGER REFERENCES billing_periods(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core table indexes
CREATE INDEX idx_patients_therapist_id ON patients(therapist_id);
CREATE INDEX idx_patients_therapist_billing ON patients(therapist_id, lv_notas_billing_start_date);
CREATE INDEX idx_sessions_therapist_id ON sessions(therapist_id);
CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_billable ON sessions(therapist_id, billable, date);
CREATE INDEX idx_sessions_billing_period ON sessions(therapist_id, billing_period);
CREATE INDEX idx_sessions_billing_period_id ON sessions(billing_period_id);

-- Onboarding table indexes
CREATE INDEX idx_imported_events_therapist_batch ON imported_calendar_events(therapist_id, import_batch_id);
CREATE INDEX idx_imported_events_therapy_sessions ON imported_calendar_events(therapist_id, is_therapy_session);
CREATE INDEX idx_imported_events_google_id ON imported_calendar_events(google_event_id);
CREATE INDEX idx_matching_candidates_therapist_batch ON patient_matching_candidates(therapist_id, import_batch_id);
CREATE INDEX idx_matching_candidates_name ON patient_matching_candidates(extracted_name);
CREATE INDEX idx_recurring_templates_therapist_patient ON recurring_session_templates(therapist_id, patient_id);
CREATE INDEX idx_recurring_templates_status ON recurring_session_templates(therapist_id, status);
CREATE INDEX idx_recurring_templates_schedule ON recurring_session_templates(day_of_week, start_time);

-- Billing history indexes
CREATE INDEX idx_therapist_billing_history_dates ON therapist_billing_history(therapist_id, effective_from_date, effective_until_date);
CREATE INDEX idx_patient_billing_history_dates ON patient_billing_history(patient_id, effective_from_date, effective_until_date);
CREATE INDEX idx_billing_periods_therapist_dates ON billing_periods(therapist_id, period_start_date, period_end_date);
CREATE INDEX idx_billing_periods_patient_dates ON billing_periods(patient_id, period_start_date, period_end_date);

-- =============================================================================
-- VIEWS FOR EASY DATA ACCESS
-- =============================================================================

-- View for billable sessions (sessions after LV Notas billing start date)
CREATE VIEW billable_sessions AS
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

-- View for onboarding progress
CREATE VIEW therapist_onboarding_progress AS
SELECT 
    t.id as therapist_id,
    t.email,
    t.onboarding_completed,
    t.onboarding_started_at,
    t.onboarding_completed_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'step', tog.step,
                'completed_at', tog.completed_at,
                'data', tog.data,
                'notes', tog.notes
            ) ORDER BY tog.completed_at
        ) FILTER (WHERE tog.step IS NOT NULL), 
        '[]'::json
    ) as completed_steps,
    CASE 
        WHEN t.onboarding_completed THEN 'completed'
        WHEN COUNT(tog.step) = 0 THEN 'not_started'
        ELSE 'in_progress'
    END as status
FROM therapists t
LEFT JOIN therapist_onboarding tog ON t.id = tog.therapist_id
GROUP BY t.id, t.email, t.onboarding_completed, t.onboarding_started_at, t.onboarding_completed_at;

-- View for current billing settings
CREATE VIEW current_billing_settings AS
SELECT 
    p.id as patient_id,
    p.nome as patient_name,
    p.therapist_id,
    t.nome as therapist_name,
    t.email as therapist_email,
    t.billing_cycle as current_billing_cycle,
    COALESCE(p.session_price, t.default_session_price) as current_session_price,
    CASE WHEN p.session_price IS NOT NULL THEN true ELSE false END as has_patient_override,
    p.lv_notas_billing_start_date,
    -- Count billable sessions for current billing period
    (SELECT COUNT(*) 
     FROM sessions s 
     WHERE s.patient_id = p.id 
        AND s.billable = true 
        AND s.status = 'compareceu'
        AND p.lv_notas_billing_start_date IS NOT NULL
        AND s.date::date >= p.lv_notas_billing_start_date
    ) as total_billable_sessions
FROM patients p
JOIN therapists t ON p.therapist_id = t.id;

-- View for billing change history
CREATE VIEW billing_change_history AS
SELECT 
    'therapist' as change_type,
    tbh.id as history_id,
    tbh.therapist_id,
    NULL::integer as patient_id,
    t.nome as therapist_name,
    NULL as patient_name,
    tbh.billing_cycle,
    tbh.default_session_price as price,
    tbh.effective_from_date,
    tbh.effective_until_date,
    tbh.reason_for_change,
    tbh.created_by,
    tbh.created_at,
    tbh.notes
FROM therapist_billing_history tbh
JOIN therapists t ON tbh.therapist_id = t.id

UNION ALL

SELECT 
    'patient' as change_type,
    pbh.id as history_id,
    pbh.therapist_id,
    pbh.patient_id,
    t.nome as therapist_name,
    p.nome as patient_name,
    pbh.billing_cycle,
    pbh.session_price as price,
    pbh.effective_from_date,
    pbh.effective_until_date,
    pbh.reason_for_change,
    pbh.created_by,
    pbh.created_at,
    pbh.notes
FROM patient_billing_history pbh
JOIN therapists t ON pbh.therapist_id = t.id
JOIN patients p ON pbh.patient_id = p.id

ORDER BY created_at DESC;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate billing sessions count
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

-- Function to extract patient name from event summary
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

-- Function to get current billing cycle for a therapist on a specific date
CREATE OR REPLACE FUNCTION get_therapist_billing_cycle(
    p_therapist_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    billing_cycle VARCHAR(20),
    default_session_price DECIMAL(10,2),
    effective_from_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tbh.billing_cycle,
        tbh.default_session_price,
        tbh.effective_from_date
    FROM therapist_billing_history tbh
    WHERE tbh.therapist_id = p_therapist_id
        AND tbh.effective_from_date <= p_date
        AND (tbh.effective_until_date IS NULL OR tbh.effective_until_date >= p_date)
    ORDER BY tbh.effective_from_date DESC
    LIMIT 1;
    
    -- If no history record exists, return the default from therapists table
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            t.billing_cycle,
            t.default_session_price,
            CURRENT_DATE as effective_from_date
        FROM therapists t
        WHERE t.id = p_therapist_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get current billing cycle for a patient (with overrides)
CREATE OR REPLACE FUNCTION get_patient_billing_cycle(
    p_patient_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    billing_cycle VARCHAR(20),
    session_price DECIMAL(10,2),
    effective_from_date DATE,
    is_override BOOLEAN
) AS $$
DECLARE
    patient_therapist_id INTEGER;
BEGIN
    -- Get the therapist for this patient
    SELECT therapist_id INTO patient_therapist_id FROM patients WHERE id = p_patient_id;
    
    -- First check for patient-specific overrides
    RETURN QUERY
    SELECT 
        pbh.billing_cycle,
        pbh.session_price,
        pbh.effective_from_date,
        true as is_override
    FROM patient_billing_history pbh
    WHERE pbh.patient_id = p_patient_id
        AND pbh.effective_from_date <= p_date
        AND (pbh.effective_until_date IS NULL OR pbh.effective_until_date >= p_date)
    ORDER BY pbh.effective_from_date DESC
    LIMIT 1;
    
    -- If no patient override, use therapist default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            therapy_cycle.billing_cycle,
            therapy_cycle.default_session_price,
            therapy_cycle.effective_from_date,
            false as is_override
        FROM get_therapist_billing_cycle(patient_therapist_id, p_date) therapy_cycle;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to change therapist billing cycle with history
CREATE OR REPLACE FUNCTION change_therapist_billing_cycle(
    p_therapist_id INTEGER,
    p_new_billing_cycle VARCHAR(20),
    p_new_default_price DECIMAL(10,2),
    p_effective_from_date DATE,
    p_reason TEXT,
    p_created_by VARCHAR(255),
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_history_id INTEGER;
BEGIN
    -- Close current billing cycle (set effective_until_date)
    UPDATE therapist_billing_history
    SET effective_until_date = p_effective_from_date - INTERVAL '1 day'
    WHERE therapist_id = p_therapist_id
        AND effective_until_date IS NULL;
    
    -- Insert new billing cycle history
    INSERT INTO therapist_billing_history (
        therapist_id,
        billing_cycle,
        default_session_price,
        effective_from_date,
        reason_for_change,
        created_by,
        notes
    ) VALUES (
        p_therapist_id,
        p_new_billing_cycle,
        p_new_default_price,
        p_effective_from_date,
        p_reason,
        p_created_by,
        p_notes
    ) RETURNING id INTO new_history_id;
    
    -- Update therapist table with current values (for quick access)
    UPDATE therapists
    SET 
        billing_cycle = p_new_billing_cycle,
        default_session_price = p_new_default_price
    WHERE id = p_therapist_id;
    
    RETURN new_history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to change patient-specific billing cycle
CREATE OR REPLACE FUNCTION change_patient_billing_cycle(
    p_patient_id INTEGER,
    p_new_billing_cycle VARCHAR(20),
    p_new_session_price DECIMAL(10,2),
    p_effective_from_date DATE,
    p_reason TEXT,
    p_created_by VARCHAR(255),
    p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_history_id INTEGER;
    patient_therapist_id INTEGER;
BEGIN
    -- Get therapist_id for this patient
    SELECT therapist_id INTO patient_therapist_id FROM patients WHERE id = p_patient_id;
    
    -- Close current patient billing override (if any)
    UPDATE patient_billing_history
    SET effective_until_date = p_effective_from_date - INTERVAL '1 day'
    WHERE patient_id = p_patient_id
        AND effective_until_date IS NULL;
    
    -- Insert new patient billing history
    INSERT INTO patient_billing_history (
        patient_id,
        therapist_id,
        billing_cycle,
        session_price,
        effective_from_date,
        reason_for_change,
        created_by,
        notes
    ) VALUES (
        p_patient_id,
        patient_therapist_id,
        p_new_billing_cycle,
        p_new_session_price,
        p_effective_from_date,
        p_reason,
        p_created_by,
        p_notes
    ) RETURNING id INTO new_history_id;
    
    -- Update patient table with current values (for quick access)
    UPDATE patients
    SET session_price = p_new_session_price
    WHERE id = p_patient_id;
    
    RETURN new_history_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPFUL COMMENTS
-- =============================================================================

COMMENT ON COLUMN patients.therapy_start_date IS 'Historical date when therapy actually began (optional, for context only)';
COMMENT ON COLUMN patients.lv_notas_billing_start_date IS 'Date when LV Notas billing begins (required, affects billing calculations)';
COMMENT ON COLUMN sessions.billable IS 'Whether this session counts toward billing (based on billing start date)';
COMMENT ON COLUMN sessions.created_during_onboarding IS 'Was this session created during the onboarding import process';
COMMENT ON TABLE therapist_billing_history IS 'Complete history of billing cycle changes for therapists';
COMMENT ON TABLE patient_billing_history IS 'Patient-specific billing overrides with full history';
COMMENT ON TABLE billing_periods IS 'Actual billing periods and invoice tracking';
COMMENT ON COLUMN therapist_billing_history.effective_until_date IS 'NULL means this is the current active billing cycle';
COMMENT ON COLUMN patient_billing_history.effective_until_date IS 'NULL means this is the current active override';