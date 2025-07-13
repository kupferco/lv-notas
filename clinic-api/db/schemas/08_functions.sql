-- clinic-api/db/schemas/08_functions.sql
-- Helper functions for database operations

-- =============================================================================
-- DROP EXISTING FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS get_billing_sessions_count(INTEGER, INTEGER, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS extract_patient_name_from_summary(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_therapist_billing_cycle(INTEGER, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_patient_billing_cycle(INTEGER, DATE) CASCADE;
DROP FUNCTION IF EXISTS change_therapist_billing_cycle(INTEGER, VARCHAR, DECIMAL, DATE, TEXT, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS change_patient_billing_cycle(INTEGER, VARCHAR, DECIMAL, DATE, TEXT, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_therapist_setting(INTEGER, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS set_therapist_setting(INTEGER, VARCHAR, VARCHAR) CASCADE;

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
-- SETTINGS FUNCTIONS
-- =============================================================================

-- Function to get therapist setting with default fallback
CREATE OR REPLACE FUNCTION get_therapist_setting(
    p_therapist_id INTEGER,
    p_setting_key VARCHAR(50),
    p_default_value VARCHAR(255) DEFAULT NULL
) RETURNS VARCHAR(255) AS $$
DECLARE
    setting_value VARCHAR(255);
BEGIN
    SELECT ts.setting_value
    INTO setting_value
    FROM therapist_settings ts
    WHERE ts.therapist_id = p_therapist_id
        AND ts.setting_key = p_setting_key;
    
    RETURN COALESCE(setting_value, p_default_value);
END;
$$ LANGUAGE plpgsql;

-- Function to set therapist setting (upsert)
CREATE OR REPLACE FUNCTION set_therapist_setting(
    p_therapist_id INTEGER,
    p_setting_key VARCHAR(50),
    p_setting_value VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO therapist_settings (therapist_id, setting_key, setting_value, updated_at)
    VALUES (p_therapist_id, p_setting_key, p_setting_value, CURRENT_TIMESTAMP)
    ON CONFLICT (therapist_id, setting_key)
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR FUNCTIONS
-- =============================================================================

COMMENT ON FUNCTION get_billing_sessions_count IS 'Calculate billable sessions count for a patient within date range';
COMMENT ON FUNCTION extract_patient_name_from_summary IS 'Extract patient name from calendar event summary text';
COMMENT ON FUNCTION get_therapist_billing_cycle IS 'Get current billing cycle configuration for therapist';
COMMENT ON FUNCTION get_patient_billing_cycle IS 'Get billing cycle for patient with override support';
COMMENT ON FUNCTION change_therapist_billing_cycle IS 'Change therapist billing cycle with history tracking';
COMMENT ON FUNCTION change_patient_billing_cycle IS 'Change patient-specific billing with history tracking';
COMMENT ON FUNCTION get_therapist_setting IS 'Get therapist UI setting with default fallback';
COMMENT ON FUNCTION set_therapist_setting IS 'Set or update therapist UI setting (upsert)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Database functions created successfully!';
END $$;