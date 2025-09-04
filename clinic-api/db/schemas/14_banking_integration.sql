-- clinic-api/db/schemas/14_banking_integration.sql
-- Banking integration with Pluggy for automatic payment tracking (Option B: Privacy-First)

\echo '🏦 Installing privacy-first banking integration tables...'

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For similarity() function in fuzzy matching

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS payment_matches CASCADE;
DROP TABLE IF EXISTS matched_transactions CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS processed_transactions CASCADE;
DROP TABLE IF EXISTS bank_connections CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS connection_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;

-- Create custom types for banking
CREATE TYPE connection_status AS ENUM ('active', 'disconnected', 'error', 'expired');
CREATE TYPE transaction_type AS ENUM ('pix', 'ted', 'doc', 'debit', 'credit', 'other');
CREATE TYPE match_status AS ENUM ('confirmed', 'disputed', 'refunded');

-- Bank connections table - stores therapist's connected bank accounts (metadata only)
CREATE TABLE bank_connections (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Pluggy integration fields
    pluggy_item_id VARCHAR(255) NOT NULL UNIQUE,
    pluggy_account_id VARCHAR(255) NOT NULL,
    
    -- Bank account information (non-sensitive metadata only)
    bank_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'checking', 'savings', 'current'
    account_holder_name VARCHAR(255), -- Just the therapist's name
    
    -- Connection status and metadata
    status connection_status DEFAULT 'active',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT true,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(therapist_id, pluggy_account_id)
);

-- Processed transactions table - tracks which Pluggy transactions we've already processed
-- This prevents reprocessing and stores minimal data for deduplication only
CREATE TABLE processed_transactions (
    id SERIAL PRIMARY KEY,
    bank_connection_id INTEGER NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    
    -- Pluggy transaction reference for deduplication
    pluggy_transaction_id VARCHAR(255) NOT NULL,
    
    -- Processing metadata (no sensitive transaction data)
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    match_found BOOLEAN NOT NULL, -- true if a match was found and stored
    
    -- Constraints
    UNIQUE(bank_connection_id, pluggy_transaction_id)
);

-- Matched transactions table - ONLY stores transactions that matched therapy sessions
-- This is the core of Option B: only matched transactions are stored
CREATE TABLE matched_transactions (
    id SERIAL PRIMARY KEY,
    
    -- Bank connection reference
    bank_connection_id INTEGER NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    
    -- Pluggy transaction reference (for API queries if needed)
    pluggy_transaction_id VARCHAR(255) NOT NULL,
    
    -- Essential transaction data (minimal for privacy)
    amount DECIMAL(10,2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_type transaction_type NOT NULL,
    
    -- Minimal sender information (privacy-compliant)
    sender_first_name VARCHAR(100), -- First name only
    sender_initials VARCHAR(10), -- e.g., "J.S." instead of full name
    
    -- PIX specific data (if applicable)
    pix_end_to_end_id VARCHAR(255),
    
    -- Session/Patient match information
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Match metadata
    match_type VARCHAR(50) NOT NULL, -- 'automatic_cpf', 'automatic_name', 'manual', 'amount_date'
    match_confidence DECIMAL(3,2), -- 0.00 to 1.00
    match_reason TEXT, -- Explanation of why this match was made
    
    -- Financial details
    session_price DECIMAL(10,2), -- Expected session price at time of match
    amount_difference DECIMAL(10,2), -- transaction amount - session price
    
    -- Status and metadata
    status match_status DEFAULT 'confirmed',
    confirmed_by VARCHAR(100), -- 'system' or 'therapist'
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes and adjustments
    notes TEXT,
    manual_adjustment BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(bank_connection_id, pluggy_transaction_id), -- Prevent duplicate processing
    UNIQUE(session_id), -- One payment per session
    CHECK (amount > 0),
    CHECK (match_confidence >= 0 AND match_confidence <= 1)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Bank connections indexes
CREATE INDEX idx_bank_connections_therapist ON bank_connections(therapist_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_pluggy_item ON bank_connections(pluggy_item_id);

-- Processed transactions indexes
CREATE INDEX idx_processed_transactions_lookup ON processed_transactions(bank_connection_id, pluggy_transaction_id);
CREATE INDEX idx_processed_transactions_date ON processed_transactions(processed_at);

-- Matched transactions indexes
CREATE INDEX idx_matched_transactions_bank_connection ON matched_transactions(bank_connection_id);
CREATE INDEX idx_matched_transactions_session ON matched_transactions(session_id);
CREATE INDEX idx_matched_transactions_patient ON matched_transactions(patient_id);
CREATE INDEX idx_matched_transactions_date ON matched_transactions(transaction_date);
CREATE INDEX idx_matched_transactions_status ON matched_transactions(status);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matched_transactions_updated_at
    BEFORE UPDATE ON matched_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for payment summary by therapist (Option B version)
CREATE VIEW therapist_payment_summary AS
SELECT 
    t.id as therapist_id,
    t.nome as therapist_name,
    COUNT(DISTINCT bc.id) as connected_accounts,
    COUNT(mt.id) as total_matched_transactions,
    SUM(mt.amount) as total_matched_revenue,
    COUNT(CASE WHEN mt.status = 'confirmed' THEN 1 END) as confirmed_transactions,
    SUM(CASE WHEN mt.status = 'confirmed' THEN mt.amount ELSE 0 END) as confirmed_revenue,
    MAX(mt.transaction_date) as last_transaction_date,
    AVG(mt.match_confidence) as average_match_confidence
FROM therapists t
LEFT JOIN bank_connections bc ON t.id = bc.therapist_id AND bc.status = 'active'
LEFT JOIN matched_transactions mt ON bc.id = mt.bank_connection_id
GROUP BY t.id, t.nome;

-- View for recent payments per therapist
CREATE VIEW recent_payments AS
SELECT 
    mt.*,
    bc.bank_name,
    bc.therapist_id,
    p.nome as patient_name,
    s.date as session_date
FROM matched_transactions mt
JOIN bank_connections bc ON mt.bank_connection_id = bc.id
JOIN patients p ON mt.patient_id = p.id
JOIN sessions s ON mt.session_id = s.id
WHERE mt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY mt.transaction_date DESC;

-- =============================================================================
-- PRIVACY COMPLIANCE FUNCTIONS
-- =============================================================================

-- Function to anonymize old matched transactions (for LGPD compliance)
CREATE OR REPLACE FUNCTION anonymize_old_transactions(months_old INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE matched_transactions 
    SET 
        sender_first_name = 'ANONYMIZED',
        sender_initials = 'A.A.',
        notes = CASE WHEN notes IS NOT NULL THEN 'ANONYMIZED' ELSE NULL END
    WHERE transaction_date < CURRENT_DATE - (months_old || ' months')::INTERVAL
    AND sender_first_name != 'ANONYMIZED';
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Anonymized % transactions older than % months', affected_rows, months_old;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE bank_connections IS 'Bank account connections metadata (no transaction data stored)';
COMMENT ON TABLE processed_transactions IS 'Deduplication tracking for Pluggy transactions (no sensitive data)';
COMMENT ON TABLE matched_transactions IS 'ONLY matched therapy payments stored with minimal patient data';

COMMENT ON COLUMN matched_transactions.sender_first_name IS 'First name only for privacy compliance';
COMMENT ON COLUMN matched_transactions.sender_initials IS 'Initials instead of full name for privacy';
COMMENT ON COLUMN matched_transactions.match_confidence IS 'Confidence score from 0.00 to 1.00 for automatic matches';

-- Success message
DO $$ BEGIN
    RAISE NOTICE '🏦 Privacy-first banking integration (Option B) created successfully!';
    RAISE NOTICE 'Privacy features:';
    RAISE NOTICE '  ✅ Only matched transactions stored';
    RAISE NOTICE '  ✅ Minimal sender information (first name + initials only)';
    RAISE NOTICE '  ✅ No unmatched customer transaction data stored';
    RAISE NOTICE '  ✅ Deduplication tracking without sensitive data';
    RAISE NOTICE '  ✅ LGPD compliance with anonymization function';
    RAISE NOTICE '  ✅ One payment per session constraint';
END $$;