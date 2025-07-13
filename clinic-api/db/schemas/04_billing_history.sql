-- clinic-api/db/schemas/04_billing_history.sql
-- Billing cycles and history tracking tables

-- =============================================================================
-- BILLING HISTORY TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS billing_periods CASCADE;
DROP TABLE IF EXISTS patient_billing_history CASCADE;
DROP TABLE IF EXISTS therapist_billing_history CASCADE;

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

-- Add billing period reference to sessions table (if not already added)
DO $$ BEGIN
    BEGIN
        ALTER TABLE sessions ADD COLUMN billing_period_id INTEGER REFERENCES billing_periods(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- =============================================================================
-- INDEXES FOR BILLING HISTORY
-- =============================================================================

CREATE INDEX idx_therapist_billing_history_dates ON therapist_billing_history(therapist_id, effective_from_date, effective_until_date);
CREATE INDEX idx_patient_billing_history_dates ON patient_billing_history(patient_id, effective_from_date, effective_until_date);
CREATE INDEX idx_billing_periods_therapist_dates ON billing_periods(therapist_id, period_start_date, period_end_date);
CREATE INDEX idx_billing_periods_patient_dates ON billing_periods(patient_id, period_start_date, period_end_date);
CREATE INDEX idx_sessions_billing_period_id ON sessions(billing_period_id);

-- =============================================================================
-- COMMENTS FOR BILLING HISTORY
-- =============================================================================

COMMENT ON TABLE therapist_billing_history IS 'Complete history of billing cycle changes for therapists';
COMMENT ON TABLE patient_billing_history IS 'Patient-specific billing overrides with full history';
COMMENT ON TABLE billing_periods IS 'Actual billing periods and invoice tracking';
COMMENT ON COLUMN therapist_billing_history.effective_until_date IS 'NULL means this is the current active billing cycle';
COMMENT ON COLUMN patient_billing_history.effective_until_date IS 'NULL means this is the current active override';
COMMENT ON COLUMN billing_periods.billable_sessions IS 'Sessions that count for billing (after LV Notas start date)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Billing history tables created successfully!';
END $$;