-- clinic-api/db/schemas/14_banking_integration.sql
-- Banking integration with Pluggy for automatic payment tracking

-- =============================================================================
-- BANKING INTEGRATION TABLES
-- =============================================================================

\echo '🏦 Installing banking integration tables...'

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For similarity() function in fuzzy matching

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS payment_matches CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_connections CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS connection_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;

-- Create custom types for banking
CREATE TYPE connection_status AS ENUM ('active', 'disconnected', 'error', 'expired');
CREATE TYPE transaction_type AS ENUM ('pix', 'ted', 'doc', 'debit', 'credit', 'other');
CREATE TYPE match_status AS ENUM ('unmatched', 'auto_matched', 'manual_matched', 'ignored');

-- Bank connections table - stores therapist's connected bank accounts
CREATE TABLE bank_connections (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Pluggy integration fields
    pluggy_item_id VARCHAR(255) NOT NULL UNIQUE,
    pluggy_account_id VARCHAR(255) NOT NULL,
    
    -- Bank account information
    bank_name VARCHAR(255) NOT NULL,
    bank_code VARCHAR(10),
    account_type VARCHAR(50) NOT NULL, -- 'checking', 'savings', 'current'
    account_number VARCHAR(50),
    account_holder_name VARCHAR(255),
    
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

-- Bank transactions table - stores all incoming transactions from connected accounts
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    bank_connection_id INTEGER NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    
    -- Pluggy transaction data
    pluggy_transaction_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Transaction details
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- PIX specific fields
    pix_sender_name VARCHAR(255),
    pix_sender_cpf VARCHAR(14),
    pix_sender_bank VARCHAR(255),
    pix_end_to_end_id VARCHAR(255),
    
    -- Generic sender information (for other transaction types)
    sender_name VARCHAR(255),
    sender_document VARCHAR(20),
    sender_bank VARCHAR(255),
    
    -- Raw transaction data from Pluggy (for debugging/future use)
    raw_data JSONB,
    
    -- Processing status
    processed_at TIMESTAMP WITH TIME ZONE,
    match_status match_status DEFAULT 'unmatched',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment matches table - links transactions to patient sessions
CREATE TABLE payment_matches (
    id SERIAL PRIMARY KEY,
    bank_transaction_id INTEGER NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    
    -- Match details
    match_type VARCHAR(50) NOT NULL, -- 'auto_cpf', 'auto_name', 'manual', 'amount_date'
    match_confidence DECIMAL(3,2), -- 0.00 to 1.00 confidence score
    match_reason TEXT, -- Explanation of why this match was made
    
    -- Financial details
    matched_amount DECIMAL(10,2) NOT NULL,
    session_price DECIMAL(10,2), -- Expected session price at time of match
    amount_difference DECIMAL(10,2), -- Difference between transaction and expected price
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    confirmed_by VARCHAR(50), -- 'therapist', 'auto', 'system'
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes and manual adjustments
    notes TEXT,
    manual_adjustment BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(bank_transaction_id, session_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Bank connections indexes
CREATE INDEX idx_bank_connections_therapist ON bank_connections(therapist_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_pluggy_item ON bank_connections(pluggy_item_id);

-- Bank transactions indexes
CREATE INDEX idx_bank_transactions_connection ON bank_transactions(bank_connection_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_amount ON bank_transactions(amount);
CREATE INDEX idx_bank_transactions_match_status ON bank_transactions(match_status);
CREATE INDEX idx_bank_transactions_pix_cpf ON bank_transactions(pix_sender_cpf);
CREATE INDEX idx_bank_transactions_sender_name ON bank_transactions(pix_sender_name);

-- Payment matches indexes
CREATE INDEX idx_payment_matches_transaction ON payment_matches(bank_transaction_id);
CREATE INDEX idx_payment_matches_session ON payment_matches(session_id);
CREATE INDEX idx_payment_matches_patient ON payment_matches(patient_id);
CREATE INDEX idx_payment_matches_status ON payment_matches(status);
CREATE INDEX idx_payment_matches_confirmed ON payment_matches(confirmed_at);

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

CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_matches_updated_at
    BEFORE UPDATE ON payment_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for unmatched transactions with potential patient matches
CREATE VIEW unmatched_transactions_with_suggestions AS
SELECT 
    bt.id as transaction_id,
    bt.amount,
    bt.description,
    bt.transaction_date,
    bt.pix_sender_name,
    bt.pix_sender_cpf,
    bc.therapist_id,
    bc.bank_name,
    -- Suggest patients based on CPF match
    p.id as suggested_patient_id,
    p.nome as suggested_patient_name,
    p.preco as expected_session_price,
    -- Calculate match confidence
    CASE 
        WHEN bt.pix_sender_cpf IS NOT NULL AND p.cpf = bt.pix_sender_cpf THEN 0.95
        WHEN SIMILARITY(bt.pix_sender_name, p.nome) > 0.7 THEN 0.80
        WHEN bt.amount = p.preco THEN 0.60
        ELSE 0.30
    END as match_confidence
FROM bank_transactions bt
JOIN bank_connections bc ON bt.bank_connection_id = bc.id
LEFT JOIN patients p ON (
    p.therapist_id = bc.therapist_id AND (
        p.cpf = bt.pix_sender_cpf OR 
        SIMILARITY(p.nome, bt.pix_sender_name) > 0.6 OR
        p.preco = bt.amount
    )
)
WHERE bt.match_status = 'unmatched'
ORDER BY bt.transaction_date DESC, match_confidence DESC;

-- View for payment summary by therapist
CREATE VIEW therapist_payment_summary AS
SELECT 
    t.id as therapist_id,
    t.nome as therapist_name,
    COUNT(bc.id) as connected_accounts,
    COUNT(bt.id) as total_transactions,
    COUNT(CASE WHEN bt.match_status = 'unmatched' THEN 1 END) as unmatched_transactions,
    COUNT(pm.id) as total_matches,
    COUNT(CASE WHEN pm.status = 'confirmed' THEN 1 END) as confirmed_matches,
    COALESCE(SUM(CASE WHEN pm.status = 'confirmed' THEN bt.amount END), 0) as confirmed_revenue,
    COALESCE(SUM(CASE WHEN bt.match_status = 'unmatched' THEN bt.amount END), 0) as unmatched_revenue,
    MAX(bt.transaction_date) as last_transaction_date
FROM therapists t
LEFT JOIN bank_connections bc ON t.id = bc.therapist_id AND bc.status = 'active'
LEFT JOIN bank_transactions bt ON bc.id = bt.bank_connection_id
LEFT JOIN payment_matches pm ON bt.id = pm.bank_transaction_id
GROUP BY t.id, t.nome;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE bank_connections IS 'Stores therapist bank account connections via Pluggy integration';
COMMENT ON TABLE bank_transactions IS 'All transactions from connected bank accounts with PIX and payment details';
COMMENT ON TABLE payment_matches IS 'Links bank transactions to patient sessions with confidence scoring';

COMMENT ON COLUMN bank_transactions.pix_sender_cpf IS 'PIX sender CPF in format XXX.XXX.XXX-XX for patient matching';
COMMENT ON COLUMN payment_matches.match_confidence IS 'Confidence score from 0.00 to 1.00 for automatic matches';
COMMENT ON COLUMN payment_matches.match_type IS 'Method used for matching: auto_cpf, auto_name, manual, amount_date';

-- Success message
DO $$ BEGIN
    RAISE NOTICE '🏦 Banking integration tables created successfully!';
    RAISE NOTICE 'New features:';
    RAISE NOTICE '  ✅ Bank account connections via Pluggy';
    RAISE NOTICE '  ✅ Transaction tracking with PIX details';
    RAISE NOTICE '  ✅ Automatic payment matching with confidence scoring';
    RAISE NOTICE '  ✅ CPF-based patient identification';
    RAISE NOTICE '  ✅ Performance indexes and helpful views';
END $$;