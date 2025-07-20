-- clinic-api/db/schemas/10_monthly_billing.sql
-- Monthly billing system for calendar-based session management

-- =============================================================================
-- MONTHLY BILLING TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS monthly_billing_periods CASCADE;
DROP TABLE IF EXISTS monthly_billing_payments CASCADE;

-- Monthly billing periods (immutable once processed)
CREATE TABLE monthly_billing_periods (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Billing period (always calendar month for MVP)
    billing_year INTEGER NOT NULL,
    billing_month INTEGER NOT NULL, -- 1-12
    
    -- Session data (snapshot from Google Calendar)
    session_count INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    session_snapshots JSONB NOT NULL DEFAULT '[]', -- [{date, time, google_event_id, patient_name}]
    
    -- Processing tracking
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(255) NOT NULL, -- therapist email who processed
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'processed', -- 'processed', 'paid', 'void'
    can_be_voided BOOLEAN DEFAULT true, -- false once payment exists
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by VARCHAR(255),
    void_reason TEXT,
    
    -- Ensure one billing period per patient per month
    UNIQUE(therapist_id, patient_id, billing_year, billing_month)
);

-- Monthly billing payments (tracks actual payments received)
CREATE TABLE monthly_billing_payments (
    id SERIAL PRIMARY KEY,
    billing_period_id INTEGER REFERENCES monthly_billing_periods(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- 'pix', 'bank_transfer', 'cash', 'credit_card'
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference_number VARCHAR(255), -- PIX transaction ID, bank reference, etc.
    
    -- Payment tracking
    recorded_by VARCHAR(255) NOT NULL, -- who recorded this payment
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR MONTHLY BILLING
-- =============================================================================

CREATE INDEX idx_monthly_billing_periods_therapist ON monthly_billing_periods(therapist_id);
CREATE INDEX idx_monthly_billing_periods_patient ON monthly_billing_periods(patient_id);
CREATE INDEX idx_monthly_billing_periods_month ON monthly_billing_periods(billing_year, billing_month);
CREATE INDEX idx_monthly_billing_periods_status ON monthly_billing_periods(therapist_id, status);
CREATE INDEX idx_monthly_billing_payments_billing_period ON monthly_billing_payments(billing_period_id);
CREATE INDEX idx_monthly_billing_payments_therapist ON monthly_billing_payments(therapist_id);
CREATE INDEX idx_monthly_billing_payments_payment_date ON monthly_billing_payments(payment_date);

-- =============================================================================
-- TRIGGERS FOR PAYMENT STATUS UPDATES
-- =============================================================================

-- Function to update billing period status when payments are added/removed
CREATE OR REPLACE FUNCTION update_billing_period_status() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Payment added: mark period as paid and prevent voiding
        UPDATE monthly_billing_periods 
        SET 
            status = 'paid',
            can_be_voided = false
        WHERE id = NEW.billing_period_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Payment deleted: check if any payments remain
        IF NOT EXISTS (
            SELECT 1 FROM monthly_billing_payments 
            WHERE billing_period_id = OLD.billing_period_id
        ) THEN
            -- No payments left: allow voiding again
            UPDATE monthly_billing_periods 
            SET 
                status = 'processed',
                can_be_voided = true
            WHERE id = OLD.billing_period_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_billing_status_on_payment_insert
    AFTER INSERT ON monthly_billing_payments
    FOR EACH ROW EXECUTE FUNCTION update_billing_period_status();

CREATE TRIGGER trigger_update_billing_status_on_payment_delete
    AFTER DELETE ON monthly_billing_payments
    FOR EACH ROW EXECUTE FUNCTION update_billing_period_status();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if billing period can be voided
CREATE OR REPLACE FUNCTION can_void_billing_period(period_id INTEGER) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM monthly_billing_periods 
        WHERE id = period_id 
        AND status != 'void' 
        AND can_be_voided = true
    );
END;
$$ LANGUAGE plpgsql;

-- Function to void a billing period
CREATE OR REPLACE FUNCTION void_billing_period(
    period_id INTEGER,
    voided_by_email VARCHAR(255),
    reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if period can be voided
    IF NOT can_void_billing_period(period_id) THEN
        RETURN false;
    END IF;
    
    -- Void the period
    UPDATE monthly_billing_periods 
    SET 
        status = 'void',
        can_be_voided = false,
        voided_at = CURRENT_TIMESTAMP,
        voided_by = voided_by_email,
        void_reason = reason
    WHERE id = period_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get billing summary for a therapist
CREATE OR REPLACE FUNCTION get_monthly_billing_summary(
    therapist_email VARCHAR(255),
    summary_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    summary_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
) RETURNS TABLE(
    patient_name VARCHAR(255),
    patient_id INTEGER,
    billing_period_id INTEGER,
    session_count INTEGER,
    total_amount DECIMAL(10,2),
    status VARCHAR(20),
    has_payment BOOLEAN,
    processed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.nome as patient_name,
        p.id as patient_id,
        bp.id as billing_period_id,
        bp.session_count,
        bp.total_amount,
        bp.status,
        EXISTS(SELECT 1 FROM monthly_billing_payments pay WHERE pay.billing_period_id = bp.id) as has_payment,
        bp.processed_at
    FROM monthly_billing_periods bp
    JOIN patients p ON bp.patient_id = p.id
    JOIN therapists t ON bp.therapist_id = t.id
    WHERE t.email = therapist_email
    AND bp.billing_year = summary_year
    AND bp.billing_month = summary_month
    AND bp.status != 'void'
    ORDER BY p.nome;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR MONTHLY BILLING
-- =============================================================================

COMMENT ON TABLE monthly_billing_periods IS 'Monthly billing periods with immutable session snapshots from Google Calendar';
COMMENT ON TABLE monthly_billing_payments IS 'Actual payments received for billing periods';
COMMENT ON COLUMN monthly_billing_periods.session_snapshots IS 'JSON array of session details from Google Calendar at processing time';
COMMENT ON COLUMN monthly_billing_periods.can_be_voided IS 'False once any payment exists - prevents accidental voiding of paid periods';
COMMENT ON FUNCTION void_billing_period IS 'Safely void a billing period with audit trail (only if no payments exist)';
COMMENT ON FUNCTION get_monthly_billing_summary IS 'Get billing overview for therapist for specific month';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Monthly billing system created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Calendar-month billing periods (1-31)';
    RAISE NOTICE '  ✅ Manual "Process Charges" per patient';
    RAISE NOTICE '  ✅ Payment tracking prevents voiding';
    RAISE NOTICE '  ✅ Delete payment → allow voiding again';
    RAISE NOTICE '  ✅ Immutable session snapshots for audit';
END $$;