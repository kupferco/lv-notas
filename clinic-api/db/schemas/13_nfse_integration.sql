-- clinic-api/db/schemas/13_nfse_integration.sql
-- NFS-e electronic invoice integration system (provider agnostic)

-- =============================================================================
-- NFS-E INTEGRATION TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS billing_period_invoices CASCADE;
DROP TABLE IF EXISTS nfse_invoices CASCADE;
DROP TABLE IF EXISTS therapist_nfse_config CASCADE;

-- Therapist NFS-e configuration (separate from core therapist data)
CREATE TABLE therapist_nfse_config (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Certificate management
    certificate_file_path VARCHAR(255),
    certificate_password_encrypted TEXT,
    certificate_expires_at TIMESTAMP WITH TIME ZONE,
    certificate_status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired, invalid
    certificate_info JSONB, -- Certificate details (common name, issuer, expiry, etc.)
    
    -- Provider integration (uses current provider from app_configuration)
    provider_company_id VARCHAR(100), -- Provider-specific company identifier
    provider_api_key_encrypted TEXT, -- Encrypted API key for current provider
    provider_registered_at TIMESTAMP WITH TIME ZONE,
    provider_settings JSONB DEFAULT '{}', -- Provider-specific configuration
    
    -- Company details for invoices
    company_cnpj VARCHAR(18), -- Format: XX.XXX.XXX/XXXX-XX
    company_name VARCHAR(255),
    company_municipal_registration VARCHAR(50),
    company_state_registration VARCHAR(50),
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    
    -- Address information
    company_address JSONB DEFAULT '{}', -- {street, number, complement, neighborhood, city, state, zipCode, cityCode}
    
    -- Tax configuration
    default_service_code VARCHAR(20) DEFAULT '14.01', -- Municipal service code for therapy
    default_tax_rate DECIMAL(5,2) DEFAULT 5.0, -- ISS rate (2-5% typically)
    default_service_description TEXT DEFAULT 'Serviços de psicoterapia',
    
    -- Invoice configuration
    invoice_series VARCHAR(10) DEFAULT '1', -- Invoice series number
    next_invoice_number INTEGER DEFAULT 1, -- Next sequential invoice number
    
    -- Feature toggles
    auto_generate_invoices BOOLEAN DEFAULT false, -- Generate automatically after payment
    send_email_to_patient BOOLEAN DEFAULT true, -- Send invoice PDF to patient
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(therapist_id)
);

-- NFS-e invoice tracking
CREATE TABLE nfse_invoices (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL, -- For backwards compatibility
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    
    -- Provider integration (records which provider was used at generation time)
    provider_used VARCHAR(50) NOT NULL, -- Which provider was used for this specific invoice
    provider_invoice_id VARCHAR(100), -- Provider-specific invoice ID
    provider_request_id VARCHAR(100), -- For tracking API requests
    provider_response JSONB DEFAULT '{}', -- Full provider response for debugging
    
    -- Invoice identification
    invoice_number VARCHAR(50),
    invoice_series VARCHAR(10),
    invoice_verification_code VARCHAR(50), -- Municipal verification code
    municipal_invoice_number VARCHAR(50), -- Official municipal number
    
    -- Invoice details
    invoice_amount DECIMAL(10,2) NOT NULL,
    service_description TEXT NOT NULL,
    service_code VARCHAR(20) NOT NULL, -- Municipal service code used
    tax_rate DECIMAL(5,2) NOT NULL, -- ISS rate applied
    tax_amount DECIMAL(10,2), -- Calculated tax amount
    
    -- Period tracking (every invoice can cover a period of sessions)
    period_start DATE,
    period_end DATE,
    session_count INTEGER DEFAULT 1, -- Number of sessions included
    
    -- Patient/recipient information (snapshot at invoice time)
    recipient_name VARCHAR(255) NOT NULL,
    recipient_cpf VARCHAR(14), -- Patient CPF if available
    recipient_email VARCHAR(255),
    recipient_address JSONB DEFAULT '{}', -- Patient address if needed
    
    -- Status tracking
    invoice_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, issued, cancelled, error
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- File URLs (provider-agnostic)
    pdf_url TEXT,
    xml_url TEXT,
    pdf_file_path VARCHAR(500), -- Local storage path if downloaded
    xml_file_path VARCHAR(500), -- Local storage path if downloaded
    
    -- Important timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issued_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Due date for invoice (if applicable)
    due_date DATE,
    
    -- Additional metadata
    notes TEXT, -- Manual notes about this invoice
    metadata JSONB DEFAULT '{}' -- Additional flexible data
);

-- Junction table to link billing periods to invoices
-- This allows one invoice to represent multiple billing periods if needed
CREATE TABLE billing_period_invoices (
    id SERIAL PRIMARY KEY,
    billing_period_id INTEGER NOT NULL REFERENCES monthly_billing_periods(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES nfse_invoices(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(billing_period_id, invoice_id)
);

-- =============================================================================
-- INDEXES FOR NFS-E PERFORMANCE
-- =============================================================================

-- Therapist NFS-e config indexes
CREATE INDEX idx_therapist_nfse_config_therapist ON therapist_nfse_config(therapist_id);
CREATE INDEX idx_therapist_nfse_config_status ON therapist_nfse_config(certificate_status, is_active);
CREATE INDEX idx_therapist_nfse_config_expires ON therapist_nfse_config(certificate_expires_at);

-- NFS-e invoices indexes
CREATE INDEX idx_nfse_invoices_therapist ON nfse_invoices(therapist_id);
CREATE INDEX idx_nfse_invoices_session ON nfse_invoices(session_id);
CREATE INDEX idx_nfse_invoices_patient ON nfse_invoices(patient_id);
CREATE INDEX idx_nfse_invoices_status ON nfse_invoices(invoice_status);
CREATE INDEX idx_nfse_invoices_provider ON nfse_invoices(provider_used);
CREATE INDEX idx_nfse_invoices_provider_id ON nfse_invoices(provider_invoice_id);
CREATE INDEX idx_nfse_invoices_created ON nfse_invoices(created_at);
CREATE INDEX idx_nfse_invoices_issued ON nfse_invoices(issued_at);
CREATE INDEX idx_nfse_invoices_period ON nfse_invoices(period_start, period_end);
CREATE INDEX idx_nfse_invoices_session_count ON nfse_invoices(session_count);

-- Composite indexes for common queries
CREATE INDEX idx_nfse_invoices_therapist_status ON nfse_invoices(therapist_id, invoice_status);
CREATE INDEX idx_nfse_invoices_therapist_date ON nfse_invoices(therapist_id, created_at);
CREATE INDEX idx_nfse_invoices_retry ON nfse_invoices(invoice_status, retry_count, last_retry_at);

-- Billing period invoices indexes
CREATE INDEX idx_billing_period_invoices_billing ON billing_period_invoices(billing_period_id);
CREATE INDEX idx_billing_period_invoices_invoice ON billing_period_invoices(invoice_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

-- Add updated_at trigger for therapist_nfse_config
CREATE TRIGGER update_therapist_nfse_config_updated_at 
    BEFORE UPDATE ON therapist_nfse_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for nfse_invoices
CREATE TRIGGER update_nfse_invoices_updated_at 
    BEFORE UPDATE ON nfse_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS FOR NFS-E TABLES
-- =============================================================================

COMMENT ON TABLE therapist_nfse_config IS 'NFS-e configuration for therapists who use electronic invoicing (provider agnostic)';
COMMENT ON TABLE nfse_invoices IS 'Electronic invoices (NFS-e) generated via any supported provider';
COMMENT ON TABLE billing_period_invoices IS 'Junction table linking billing periods to their invoices';

COMMENT ON COLUMN therapist_nfse_config.provider_company_id IS 'Provider-specific company identifier';
COMMENT ON COLUMN therapist_nfse_config.provider_api_key_encrypted IS 'Encrypted API key for the currently active provider';
COMMENT ON COLUMN therapist_nfse_config.provider_settings IS 'Provider-specific configuration as JSON';
COMMENT ON COLUMN therapist_nfse_config.certificate_file_path IS 'Path to encrypted digital certificate file (.p12/.pfx)';
COMMENT ON COLUMN therapist_nfse_config.certificate_password_encrypted IS 'Encrypted password for the digital certificate';
COMMENT ON COLUMN therapist_nfse_config.certificate_expires_at IS 'When the digital certificate expires';
COMMENT ON COLUMN therapist_nfse_config.certificate_status IS 'Certificate validation status: pending, active, expired, invalid';
COMMENT ON COLUMN therapist_nfse_config.company_address IS 'JSON object with complete company address';
COMMENT ON COLUMN therapist_nfse_config.auto_generate_invoices IS 'Whether to automatically generate invoices after payment confirmation';
COMMENT ON COLUMN therapist_nfse_config.next_invoice_number IS 'Next sequential invoice number for this therapist';

COMMENT ON COLUMN nfse_invoices.provider_used IS 'Which provider was used to generate this invoice (snapshot at creation time)';
COMMENT ON COLUMN nfse_invoices.provider_invoice_id IS 'Provider-specific invoice identifier';
COMMENT ON COLUMN nfse_invoices.provider_response IS 'Full API response from provider for debugging';
COMMENT ON COLUMN nfse_invoices.service_code IS 'Municipal service code (e.g., 14.01 for therapy services)';
COMMENT ON COLUMN nfse_invoices.tax_rate IS 'ISS tax rate applied (typically 2-5% for therapy)';
COMMENT ON COLUMN nfse_invoices.period_start IS 'Start date of the period covered by this invoice';
COMMENT ON COLUMN nfse_invoices.period_end IS 'End date of the period covered by this invoice';
COMMENT ON COLUMN nfse_invoices.session_count IS 'Number of sessions included in this invoice (1 for single, multiple for period)';
COMMENT ON COLUMN nfse_invoices.invoice_status IS 'Invoice processing status: pending, processing, issued, cancelled, error';
COMMENT ON COLUMN nfse_invoices.recipient_name IS 'Patient name at time of invoice generation (snapshot)';
COMMENT ON COLUMN nfse_invoices.retry_count IS 'Number of times invoice generation was retried after failure';
COMMENT ON COLUMN nfse_invoices.metadata IS 'Additional flexible data storage for provider-specific information';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ BEGIN
    RAISE NOTICE 'NFS-e integration tables created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Simplified architecture: all invoices are collections of sessions';
    RAISE NOTICE '  - Provider agnostic design - switch providers without schema changes';
    RAISE NOTICE '  - Clean separation from core therapist data';  
    RAISE NOTICE '  - Optional - only therapists who need invoicing have records';
    RAISE NOTICE '  - Complete certificate and company configuration';
    RAISE NOTICE '  - Comprehensive invoice tracking with retry logic';
    RAISE NOTICE '  - Period tracking for multi-session invoices';
    RAISE NOTICE '  - Performance optimized with proper indexing';
END $$;