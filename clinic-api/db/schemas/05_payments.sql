-- clinic-api/db/schemas/05_payments.sql
-- Payment tracking and transactions tables

-- =============================================================================
-- PAYMENT TRACKING TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS payment_status_history CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;

-- Payment transactions - records of actual payments received
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- 'pix', 'bank_transfer', 'cash', 'credit_card', etc.
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference_number VARCHAR(255), -- PIX transaction ID, bank reference, etc.
    notes TEXT,
    created_by VARCHAR(255) NOT NULL, -- who recorded this payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment requests - log of payment communications sent to patients
CREATE TABLE payment_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    session_ids INTEGER[], -- Array of session IDs included in this request
    total_amount DECIMAL(10,2) NOT NULL,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    request_type VARCHAR(20) DEFAULT 'invoice', -- 'invoice', 'reminder', 'overdue'
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_message TEXT, -- The actual message sent
    response_received BOOLEAN DEFAULT false,
    response_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment status history - complete audit trail
CREATE TABLE payment_status_history (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    payment_transaction_id INTEGER REFERENCES payment_transactions(id) ON DELETE SET NULL
);

-- =============================================================================
-- INDEXES FOR PAYMENT TABLES
-- =============================================================================

CREATE INDEX idx_payment_transactions_session_id ON payment_transactions(session_id);
CREATE INDEX idx_payment_transactions_patient_id ON payment_transactions(patient_id);
CREATE INDEX idx_payment_transactions_therapist_id ON payment_transactions(therapist_id);
CREATE INDEX idx_payment_transactions_payment_date ON payment_transactions(payment_date);
CREATE INDEX idx_payment_requests_patient_id ON payment_requests(patient_id);
CREATE INDEX idx_payment_requests_therapist_id ON payment_requests(therapist_id);
CREATE INDEX idx_payment_requests_request_date ON payment_requests(request_date);
CREATE INDEX idx_payment_status_history_session_id ON payment_status_history(session_id);

-- =============================================================================
-- COMMENTS FOR PAYMENT TABLES
-- =============================================================================

COMMENT ON TABLE payment_transactions IS 'Records of actual payments received from patients';
COMMENT ON TABLE payment_requests IS 'Log of payment communications sent to patients (WhatsApp, email, etc.)';
COMMENT ON TABLE payment_status_history IS 'Complete audit trail of payment status changes';
COMMENT ON COLUMN payment_requests.session_ids IS 'Array of session IDs included in this payment request';
COMMENT ON COLUMN payment_requests.whatsapp_message IS 'The actual message content sent via WhatsApp';
COMMENT ON COLUMN payment_transactions.payment_method IS 'PIX, bank transfer, cash, credit card, etc.';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Payment tracking tables created successfully!';
END $$;