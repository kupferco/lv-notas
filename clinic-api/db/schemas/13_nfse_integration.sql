-- clinic-api/db/schemas/13_nfse_integration.sql
-- NFS-e electronic invoice integration system (provider agnostic)

-- =============================================================================
-- NFS-E INTEGRATION TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
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
    
    -- Provider integration (agnostic)
    nfse_provider VARCHAR(50) DEFAULT 'plugnotas', -- plugnotas, focus_nfe, nfe_io, direct_municipal
    provider_company_id VARCHAR(100), -- Provider-specific company identifier
    provider_api_key_encrypted TEXT, -- Encrypted API key for this provider
    provider_registered_at TIMESTAMP WITH TIME ZONE,
    provider_settings JSONB DEFAULT '{}', -- Provider-specific configuration
    
    -- Company details for invoices
    company_cnpj VARCHAR(18) NOT NULL, -- Format: XX.XXX.XXX/XXXX-XX
    company_name VARCHAR(255) NOT NULL,
    company_municipal_registration VARCHAR(50),
    company_state_registration VARCHAR(50),
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    
    -- Address information
    company_address JSONB DEFAULT '{}', -- {street, number, complement, neighborhood, city, state, zipCode}
    
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
    
    -- Ensure one config per therapist
    UNIQUE(therapist_id)
);

-- NFS-e invoice tracking
CREATE TABLE nfse_invoices (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    nfse_config_id INTEGER NOT NULL REFERENCES therapist_nfse_config(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    
    -- Provider integration (agnostic)
    nfse_provider VARCHAR(50) NOT NULL, -- Which provider was used for this invoice
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

-- =============================================================================
-- INDEXES FOR NFS-E PERFORMANCE
-- =============================================================================

-- Therapist NFS-e config indexes
CREATE INDEX idx_therapist_nfse_config_therapist ON therapist_nfse_config(therapist_id);
CREATE INDEX idx_therapist_nfse_config_status ON therapist_nfse_config(certificate_status, is_active);
CREATE INDEX idx_therapist_nfse_config_expires ON therapist_nfse_config(certificate_expires_at);
CREATE INDEX idx_therapist_nfse_config_provider ON therapist_nfse_config(nfse_provider, is_active);

-- NFS-e invoices indexes
CREATE INDEX idx_nfse_invoices_therapist ON nfse_invoices(therapist_id);
CREATE INDEX idx_nfse_invoices_config ON nfse_invoices(nfse_config_id);
CREATE INDEX idx_nfse_invoices_session ON nfse_invoices(session_id);
CREATE INDEX idx_nfse_invoices_patient ON nfse_invoices(patient_id);
CREATE INDEX idx_nfse_invoices_status ON nfse_invoices(invoice_status);
CREATE INDEX idx_nfse_invoices_provider ON nfse_invoices(nfse_provider);
CREATE INDEX idx_nfse_invoices_provider_id ON nfse_invoices(provider_invoice_id);
CREATE INDEX idx_nfse_invoices_created ON nfse_invoices(created_at);
CREATE INDEX idx_nfse_invoices_issued ON nfse_invoices(issued_at);

-- Composite indexes for common queries
CREATE INDEX idx_nfse_invoices_therapist_status ON nfse_invoices(therapist_id, invoice_status);
CREATE INDEX idx_nfse_invoices_therapist_date ON nfse_invoices(therapist_id, created_at);
CREATE INDEX idx_nfse_invoices_retry ON nfse_invoices(invoice_status, retry_count, last_retry_at);

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
-- NFS-E CONFIGURATION SETTINGS (PROVIDER AGNOSTIC)
-- =============================================================================

-- Add NFS-e configuration to app_configuration
INSERT INTO app_configuration (key, value, description) VALUES 
(
    'nfse_enabled',
    'true',
    'Whether NFS-e integration is enabled globally'
),
(
    'nfse_default_provider',
    'plugnotas',
    'Default NFS-e provider: plugnotas, focus_nfe, nfe_io, direct_municipal'
),
(
    'nfse_sandbox_mode',
    'true',
    'Whether to use sandbox/test mode (true) or production (false)'
),
(
    'nfse_certificate_storage_path',
    '/secure/certificates/',
    'Base path for storing encrypted certificates'
),
(
    'nfse_pdf_storage_path',
    '/secure/invoices/pdf/',
    'Base path for storing invoice PDF files'
),
(
    'nfse_xml_storage_path',
    '/secure/invoices/xml/',
    'Base path for storing invoice XML files'
),
(
    'nfse_auto_retry_failed',
    'true',
    'Whether to automatically retry failed invoice generation'
),
(
    'nfse_max_retry_attempts',
    '3',
    'Maximum number of retry attempts for failed invoices'
),
(
    'nfse_retry_delay_minutes',
    '5',
    'Minutes to wait between retry attempts'
),
(
    'nfse_auto_download_files',
    'true',
    'Whether to automatically download and store PDF/XML files locally'
),
(
    'nfse_email_notification_enabled',
    'true',
    'Whether to send email notifications about invoice status changes'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- PROVIDER-SPECIFIC CONFIGURATION TEMPLATES
-- =============================================================================

-- Insert default provider settings templates
INSERT INTO app_configuration (key, value, description) VALUES 
(
    'nfse_provider_plugnotas_api_url',
    'https://api.plugnotas.com.br',
    'PlugNotas API base URL'
),
(
    'nfse_provider_focus_nfe_api_url',
    'https://api.focusnfe.com.br',
    'Focus NFe API base URL'
),
(
    'nfse_provider_nfe_io_api_url',
    'https://api.nfe.io',
    'NFe.io API base URL'
),
(
    'nfse_provider_plugnotas_features',
    '{"supports_webhook": true, "supports_pdf_generation": true, "supports_xml_download": true}',
    'PlugNotas provider feature capabilities'
),
(
    'nfse_provider_focus_nfe_features',
    '{"supports_webhook": true, "supports_pdf_generation": true, "supports_xml_download": true}',
    'Focus NFe provider feature capabilities'
),
(
    'nfse_provider_nfe_io_features',
    '{"supports_webhook": false, "supports_pdf_generation": true, "supports_xml_download": true}',
    'NFe.io provider feature capabilities'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- COMMENTS FOR NFS-E TABLES
-- =============================================================================

COMMENT ON TABLE therapist_nfse_config IS 'NFS-e configuration for therapists who use electronic invoicing (provider agnostic)';
COMMENT ON TABLE nfse_invoices IS 'Electronic invoices (NFS-e) generated via any supported provider';

COMMENT ON COLUMN therapist_nfse_config.nfse_provider IS 'NFS-e provider: plugnotas, focus_nfe, nfe_io, direct_municipal';
COMMENT ON COLUMN therapist_nfse_config.provider_company_id IS 'Provider-specific company identifier';
COMMENT ON COLUMN therapist_nfse_config.provider_api_key_encrypted IS 'Encrypted API key for the selected provider';
COMMENT ON COLUMN therapist_nfse_config.provider_settings IS 'Provider-specific configuration as JSON';
COMMENT ON COLUMN therapist_nfse_config.certificate_file_path IS 'Path to encrypted digital certificate file (.p12/.pfx)';
COMMENT ON COLUMN therapist_nfse_config.certificate_password_encrypted IS 'Encrypted password for the digital certificate';
COMMENT ON COLUMN therapist_nfse_config.certificate_expires_at IS 'When the digital certificate expires';
COMMENT ON COLUMN therapist_nfse_config.certificate_status IS 'Certificate validation status: pending, active, expired, invalid';
COMMENT ON COLUMN therapist_nfse_config.company_address IS 'JSON object with complete company address';
COMMENT ON COLUMN therapist_nfse_config.auto_generate_invoices IS 'Whether to automatically generate invoices after payment confirmation';
COMMENT ON COLUMN therapist_nfse_config.next_invoice_number IS 'Next sequential invoice number for this therapist';

COMMENT ON COLUMN nfse_invoices.nfse_provider IS 'Which provider was used to generate this invoice';
COMMENT ON COLUMN nfse_invoices.provider_invoice_id IS 'Provider-specific invoice identifier';
COMMENT ON COLUMN nfse_invoices.provider_response IS 'Full API response from provider for debugging';
COMMENT ON COLUMN nfse_invoices.service_code IS 'Municipal service code (e.g., 14.01 for therapy services)';
COMMENT ON COLUMN nfse_invoices.tax_rate IS 'ISS tax rate applied (typically 2-5% for therapy)';
COMMENT ON COLUMN nfse_invoices.invoice_status IS 'Invoice processing status: pending, processing, issued, cancelled, error';
COMMENT ON COLUMN nfse_invoices.recipient_name IS 'Patient name at time of invoice generation (snapshot)';
COMMENT ON COLUMN nfse_invoices.retry_count IS 'Number of times invoice generation was retried after failure';
COMMENT ON COLUMN nfse_invoices.metadata IS 'Additional flexible data storage for provider-specific information';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ BEGIN
    RAISE NOTICE '🧾 NFS-e integration tables created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Provider agnostic design (PlugNotas, Focus NFe, NFe.io, Direct)';
    RAISE NOTICE '  ✅ Clean separation from core therapist data';
    RAISE NOTICE '  ✅ Optional - only therapists who need invoicing have records';
    RAISE NOTICE '  ✅ Complete certificate and company configuration';
    RAISE NOTICE '  ✅ Flexible provider integration with encrypted API keys';
    RAISE NOTICE '  ✅ Comprehensive invoice tracking with retry logic';
    RAISE NOTICE '  ✅ Local file storage support for PDF/XML';
    RAISE NOTICE '  ✅ Performance optimized with proper indexing';
    RAISE NOTICE '';
    RAISE NOTICE '🔌 Supported Providers:';
    RAISE NOTICE '  • PlugNotas (default)';
    RAISE NOTICE '  • Focus NFe';
    RAISE NOTICE '  • NFe.io';
    RAISE NOTICE '  • Direct Municipal (future)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Architecture Benefits:';
    RAISE NOTICE '  • Easy to switch providers without schema changes';
    RAISE NOTICE '  • Core therapist table stays clean and fast';
    RAISE NOTICE '  • NFS-e is truly optional feature';
    RAISE NOTICE '  • Provider-specific settings stored as JSON';
    RAISE NOTICE '  • Complete audit trail with provider responses';
END $$;