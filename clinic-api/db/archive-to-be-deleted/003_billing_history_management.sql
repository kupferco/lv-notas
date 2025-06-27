-- clinic-api/db/003_billing_history_management.sql
-- Advanced billing cycle management with full history tracking
-- Handles changes to billing cycles with proper historical records

-- Create billing cycle history table for therapists
CREATE TABLE IF NOT EXISTS therapist_billing_history (
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

-- Create patient-specific billing overrides with history
CREATE TABLE IF NOT EXISTS patient_billing_history (
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

-- Create billing periods table for tracking invoicing cycles
CREATE TABLE IF NOT EXISTS billing_periods (
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

-- Add billing change tracking to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS billing_cycle_used VARCHAR(20); -- What cycle was active when this session occurred
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS billing_period_id INTEGER REFERENCES billing_periods(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_therapist_billing_history_dates ON therapist_billing_history(therapist_id, effective_from_date, effective_until_date);
CREATE INDEX IF NOT EXISTS idx_patient_billing_history_dates ON patient_billing_history(patient_id, effective_from_date, effective_until_date);
CREATE INDEX IF NOT EXISTS idx_billing_periods_therapist_dates ON billing_periods(therapist_id, period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_billing_periods_patient_dates ON billing_periods(patient_id, period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_sessions_billing_period ON sessions(billing_period_id);

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

-- Create comprehensive billing view
CREATE OR REPLACE VIEW current_billing_settings AS
SELECT 
    p.id as patient_id,
    p.nome as patient_name,
    p.therapist_id,
    t.nome as therapist_name,
    t.email as therapist_email,
    COALESCE(
        (SELECT billing_cycle FROM get_patient_billing_cycle(p.id, CURRENT_DATE)),
        t.billing_cycle
    ) as current_billing_cycle,
    COALESCE(
        (SELECT session_price FROM get_patient_billing_cycle(p.id, CURRENT_DATE)),
        t.default_session_price
    ) as current_session_price,
    (SELECT is_override FROM get_patient_billing_cycle(p.id, CURRENT_DATE)) as has_patient_override,
    p.lv_notas_billing_start_date,
    -- Count billable sessions for current billing period
    (SELECT COUNT(*) 
     FROM sessions s 
     WHERE s.patient_id = p.id 
        AND s.billable = true 
        AND s.status = 'compareceu'
        AND s.date::date >= p.lv_notas_billing_start_date
    ) as total_billable_sessions
FROM patients p
JOIN therapists t ON p.therapist_id = t.id;

-- Create view for billing change history
CREATE OR REPLACE VIEW billing_change_history AS
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

-- Migrate existing data to billing history
-- Insert current therapist billing settings as first history record
INSERT INTO therapist_billing_history (
    therapist_id,
    billing_cycle,
    default_session_price,
    effective_from_date,
    reason_for_change,
    created_by,
    notes
)
SELECT 
    id,
    COALESCE(billing_cycle, 'monthly'),
    default_session_price,
    COALESCE(created_at::date, CURRENT_DATE),
    'Initial setup during system enhancement',
    'system',
    'Migrated from original therapist settings'
FROM therapists
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_billing_history tbh 
    WHERE tbh.therapist_id = therapists.id
);

-- Add helpful comments
COMMENT ON TABLE therapist_billing_history IS 'Complete history of billing cycle changes for therapists';
COMMENT ON TABLE patient_billing_history IS 'Patient-specific billing overrides with full history';
COMMENT ON TABLE billing_periods IS 'Actual billing periods and invoice tracking';
COMMENT ON COLUMN therapist_billing_history.effective_until_date IS 'NULL means this is the current active billing cycle';
COMMENT ON COLUMN patient_billing_history.effective_until_date IS 'NULL means this is the current active override';