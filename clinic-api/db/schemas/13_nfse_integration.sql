-- clinic-api/db/schemas/13_nfse_integration.sql
-- Complete NFS-e integration schema with frontend support

-- =============================================================================
-- CLEANUP
-- =============================================================================

DROP TABLE IF EXISTS nfse_invoices CASCADE;
DROP TABLE IF EXISTS therapist_nfse_config CASCADE;
DROP TABLE IF EXISTS provider_configuration CASCADE;
DROP FUNCTION IF EXISTS get_next_invoice_ref CASCADE;
DROP FUNCTION IF EXISTS get_invoice_status_for_billing_period CASCADE;
DROP FUNCTION IF EXISTS cancel_nfse_invoice CASCADE;
DROP FUNCTION IF EXISTS retry_failed_invoice CASCADE;
DROP VIEW IF EXISTS v_billing_period_invoices CASCADE;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Provider configuration (Focus NFE master settings)
CREATE TABLE provider_configuration (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL DEFAULT 'focus_nfe',
  master_token_encrypted TEXT, -- Your master API token
  sandbox_mode BOOLEAN DEFAULT false,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Minimal therapist NFS-e configuration
CREATE TABLE therapist_nfse_config (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Core identification (provider handles everything else via CNPJ)
    cnpj VARCHAR(14) NOT NULL, -- Unformatted: 00000000000000
    
    -- Provider-specific data (tokens from Focus NFE)
    provider_company_id VARCHAR(100), -- Focus NFE empresa ID
    provider_company_token_encrypted TEXT, -- Company's production token (cached)
    provider_sandbox_token_encrypted TEXT, -- Company's sandbox token (cached)
    
    -- Certificate storage
    certificate_file_path VARCHAR(255), -- Path to encrypted certificate file
    certificate_password_encrypted TEXT, -- Encrypted certificate password
    certificate_expires_at TIMESTAMP WITH TIME ZONE, -- Certificate expiration
    certificate_status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired
    certificate_info JSONB, -- Certificate details (CN, issuer, etc)
    
    -- Company information
    company_name VARCHAR(255), -- Company legal name
    company_cnpj VARCHAR(14), -- Can be different from certificate CNPJ
    company_municipal_registration VARCHAR(50),
    company_state_registration VARCHAR(50),
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    company_address JSONB, -- Full address as JSON
    
    -- Invoice preferences
    default_service_code VARCHAR(20) DEFAULT '07498', -- SP psychology code
    default_item_lista_servico VARCHAR(10) DEFAULT '1401', -- ABRASF code
    default_tax_rate DECIMAL(5,2) DEFAULT 2.0, -- ISS rate for health services
    default_service_description TEXT DEFAULT 'Sessão de psicoterapia',
    
    -- Invoice counter for our reference system
    next_invoice_ref INTEGER DEFAULT 1, -- For generating LV-1, LV-2, etc.
    
    -- Feature preferences
    send_email_to_patient BOOLEAN DEFAULT true,
    include_session_details BOOLEAN DEFAULT true, -- Add dates in description
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(therapist_id),
    UNIQUE(cnpj)
);

-- NFS-e invoice records
CREATE TABLE nfse_invoices (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Our reference system
    internal_ref VARCHAR(50) NOT NULL, -- Format: LV-1, LV-2, etc.
    ref_number INTEGER NOT NULL, -- The numeric part for ordering
    
    -- Link to billing period
    billing_period_id INTEGER REFERENCES monthly_billing_periods(id) ON DELETE SET NULL,
    
    -- Invoice data sent
    invoice_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    service_description TEXT NOT NULL,
    session_count INTEGER DEFAULT 1,
    
    -- Patient data snapshot
    patient_name VARCHAR(255) NOT NULL,
    patient_document VARCHAR(14) NOT NULL, -- CPF or CNPJ
    patient_document_type VARCHAR(4) NOT NULL, -- 'cpf' or 'cnpj'
    patient_email VARCHAR(255),
    
    -- Provider response data
    provider_status VARCHAR(50), -- autorizado, processando, erro, etc.
    provider_reference VARCHAR(100), -- The ref we sent to provider
    provider_invoice_id VARCHAR(100), -- Provider's ID
    
    -- Municipal data (from provider response)
    invoice_number VARCHAR(50), -- Official invoice number for display
    municipal_number VARCHAR(50), -- Official municipal number
    verification_code VARCHAR(50), -- Municipal verification code
    issue_date DATE, -- Date invoice was issued (for display)
    
    -- URLs from provider
    pdf_url TEXT,
    xml_url TEXT,
    municipal_url TEXT, -- URL to verify on municipality website
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, issued, cancelled, error
    error_message TEXT,
    cancellation_reason TEXT, -- Reason for cancellation (shown in UI)
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issued_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Provider raw response for debugging
    provider_response JSONB DEFAULT '{}'
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_therapist_nfse_config_cnpj ON therapist_nfse_config(cnpj);
CREATE INDEX idx_therapist_nfse_config_active ON therapist_nfse_config(is_active);

CREATE INDEX idx_nfse_invoices_therapist ON nfse_invoices(therapist_id);
CREATE INDEX idx_nfse_invoices_patient ON nfse_invoices(patient_id);
CREATE INDEX idx_nfse_invoices_billing_period ON nfse_invoices(billing_period_id);
CREATE INDEX idx_nfse_invoices_ref ON nfse_invoices(internal_ref);
CREATE INDEX idx_nfse_invoices_ref_number ON nfse_invoices(ref_number);
CREATE INDEX idx_nfse_invoices_status ON nfse_invoices(status);
CREATE INDEX idx_nfse_invoices_date ON nfse_invoices(invoice_date);
CREATE INDEX idx_nfse_invoices_provider_ref ON nfse_invoices(provider_reference);

-- Composite indexes
CREATE INDEX idx_nfse_invoices_therapist_status ON nfse_invoices(therapist_id, status);
CREATE INDEX idx_nfse_invoices_therapist_ref ON nfse_invoices(therapist_id, ref_number);
CREATE INDEX idx_nfse_invoices_billing_period_lookup ON nfse_invoices(billing_period_id, status);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for frontend to easily get invoice status with patient info
CREATE OR REPLACE VIEW v_billing_period_invoices AS
SELECT 
  bp.id AS billing_period_id,
  bp.patient_id,
  bp.therapist_id,
  bp.billing_year,
  bp.billing_month,
  bp.status AS billing_status,
  bp.total_amount,
  ni.id AS invoice_id,
  ni.status AS invoice_status,
  ni.invoice_number,
  ni.municipal_number,
  ni.issue_date,
  ni.error_message,
  ni.cancellation_reason,
  ni.pdf_url,
  ni.xml_url,
  ni.created_at AS invoice_created_at,
  ni.issued_at AS invoice_issued_at,
  ni.cancelled_at AS invoice_cancelled_at
FROM monthly_billing_periods bp
LEFT JOIN nfse_invoices ni ON ni.billing_period_id = bp.id
WHERE bp.status = 'paid'; -- Only show for paid billing periods

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get next invoice reference for a therapist
-- Supports both simple (LV-1) and company-prefixed (LV-149459-1) formats
CREATE OR REPLACE FUNCTION get_next_invoice_ref(
    p_therapist_id INTEGER,
    p_include_company_id BOOLEAN DEFAULT FALSE
) 
RETURNS TABLE(ref VARCHAR, ref_number INTEGER) AS $$
DECLARE
    v_next_number INTEGER;
    v_company_id VARCHAR(100);
    v_ref VARCHAR;
BEGIN
    -- Get and increment the counter atomically, optionally get company ID
    IF p_include_company_id THEN
        UPDATE therapist_nfse_config 
        SET next_invoice_ref = next_invoice_ref + 1
        WHERE therapist_id = p_therapist_id
        RETURNING next_invoice_ref - 1, provider_company_id 
        INTO v_next_number, v_company_id;
        
        -- Format with company ID if available
        IF v_company_id IS NOT NULL THEN
            v_ref := 'LV-' || v_company_id || '-' || v_next_number;
        ELSE
            v_ref := 'LV-' || v_next_number; -- Fallback to simple format
        END IF;
    ELSE
        -- Simple format
        UPDATE therapist_nfse_config 
        SET next_invoice_ref = next_invoice_ref + 1
        WHERE therapist_id = p_therapist_id
        RETURNING next_invoice_ref - 1 INTO v_next_number;
        
        v_ref := 'LV-' || v_next_number;
    END IF;
    
    IF v_next_number IS NULL THEN
        RAISE EXCEPTION 'Therapist % not configured for NFS-e', p_therapist_id;
    END IF;
    
    RETURN QUERY SELECT v_ref, v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get invoice status for frontend
CREATE OR REPLACE FUNCTION get_invoice_status_for_billing_period(p_billing_period_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  invoice_status VARCHAR,
  invoice_number VARCHAR,
  issue_date DATE,
  error_message TEXT,
  cancellation_reason TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  municipal_number VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ni.id,
    ni.status AS invoice_status,
    ni.invoice_number,
    ni.issue_date,
    ni.error_message,
    ni.cancellation_reason,
    ni.pdf_url,
    ni.xml_url,
    ni.municipal_number
  FROM nfse_invoices ni
  WHERE ni.billing_period_id = p_billing_period_id
  ORDER BY ni.created_at DESC
  LIMIT 1; -- Get most recent invoice for this billing period
END;
$$ LANGUAGE plpgsql;

-- Function to cancel invoice (matches frontend's cancelInvoice call)
CREATE OR REPLACE FUNCTION cancel_nfse_invoice(
  p_invoice_id INTEGER,
  p_reason TEXT DEFAULT 'Cancelamento solicitado pelo usuário'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status VARCHAR;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM nfse_invoices
  WHERE id = p_invoice_id;
  
  IF v_current_status != 'issued' THEN
    RAISE EXCEPTION 'Invoice cannot be cancelled - current status: %', v_current_status;
  END IF;
  
  -- Update invoice status
  UPDATE nfse_invoices
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_invoice_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed invoice generation
CREATE OR REPLACE FUNCTION retry_failed_invoice(p_billing_period_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_new_ref VARCHAR;
  v_new_ref_number INTEGER;
  v_therapist_id INTEGER;
  v_patient_id INTEGER;
  v_invoice_id INTEGER;
BEGIN
  -- Get billing period info
  SELECT therapist_id, patient_id 
  INTO v_therapist_id, v_patient_id
  FROM monthly_billing_periods
  WHERE id = p_billing_period_id;
  
  -- Get new reference number
  SELECT ref, ref_number INTO v_new_ref, v_new_ref_number
  FROM get_next_invoice_ref(v_therapist_id);
  
  -- Create new invoice record with pending status
  INSERT INTO nfse_invoices (
    therapist_id,
    patient_id,
    billing_period_id,
    internal_ref,
    ref_number,
    invoice_date,
    amount,
    service_description,
    patient_name,
    patient_document,
    patient_document_type,
    status,
    retry_count
  )
  SELECT 
    therapist_id,
    patient_id,
    billing_period_id,
    v_new_ref,
    v_new_ref_number,
    CURRENT_DATE,
    amount,
    service_description,
    patient_name,
    patient_document,
    patient_document_type,
    'pending',
    retry_count + 1
  FROM nfse_invoices
  WHERE billing_period_id = p_billing_period_id
    AND status = 'error'
  ORDER BY created_at DESC
  LIMIT 1
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_therapist_nfse_config_updated_at 
    BEFORE UPDATE ON therapist_nfse_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfse_invoices_updated_at 
    BEFORE UPDATE ON nfse_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_configuration_updated_at 
    BEFORE UPDATE ON provider_configuration 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE provider_configuration IS 'Provider API configuration (Focus NFE master settings)';
COMMENT ON TABLE therapist_nfse_config IS 'Minimal NFS-e configuration - provider handles company data';
COMMENT ON TABLE nfse_invoices IS 'Invoice records with provider integration';
COMMENT ON VIEW v_billing_period_invoices IS 'Simplified view for frontend invoice queries';

COMMENT ON COLUMN therapist_nfse_config.cnpj IS 'CNPJ is the only identifier needed - provider stores everything else';
COMMENT ON COLUMN therapist_nfse_config.next_invoice_ref IS 'Counter for generating LV-1, LV-2, etc. references';
COMMENT ON COLUMN therapist_nfse_config.provider_company_token_encrypted IS 'Cached company token from Focus NFE (optional optimization)';

COMMENT ON COLUMN nfse_invoices.internal_ref IS 'Our reference format: LV-1, LV-2, etc. for tracking';
COMMENT ON COLUMN nfse_invoices.ref_number IS 'Numeric part of reference for ordering and incrementing';
COMMENT ON COLUMN nfse_invoices.provider_reference IS 'The reference we send to the provider (same as internal_ref)';
COMMENT ON COLUMN nfse_invoices.provider_response IS 'Complete provider API response for debugging';
COMMENT ON COLUMN nfse_invoices.patient_document IS 'CPF (11 digits) or CNPJ (14 digits) without formatting';
COMMENT ON COLUMN nfse_invoices.session_count IS 'Number of sessions included (for period invoices)';
COMMENT ON COLUMN nfse_invoices.invoice_number IS 'Municipal invoice number displayed in UI';
COMMENT ON COLUMN nfse_invoices.issue_date IS 'Date invoice was issued (for display)';
COMMENT ON COLUMN nfse_invoices.cancellation_reason IS 'Reason for cancellation (shown in UI)';

COMMENT ON FUNCTION get_invoice_status_for_billing_period IS 'Used by frontend to check invoice status';
COMMENT ON FUNCTION cancel_nfse_invoice IS 'Cancels an issued invoice with reason';
COMMENT ON FUNCTION retry_failed_invoice IS 'Creates new invoice attempt after error';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NFS-e Integration Schema Installed';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Core Features:';
    RAISE NOTICE '  ✓ Provider-agnostic design';
    RAISE NOTICE '  ✓ Minimal CNPJ-based configuration';
    RAISE NOTICE '  ✓ LV-X reference numbering system';
    RAISE NOTICE '  ✓ Full invoice lifecycle tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend Support:';
    RAISE NOTICE '  ✓ Invoice status queries by billing period';
    RAISE NOTICE '  ✓ Cancel invoice with reason tracking';
    RAISE NOTICE '  ✓ Retry failed invoices';
    RAISE NOTICE '  ✓ Display fields (invoice number, issue date)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  • provider_configuration';
    RAISE NOTICE '  • therapist_nfse_config';
    RAISE NOTICE '  • nfse_invoices';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  • get_next_invoice_ref()';
    RAISE NOTICE '  • get_invoice_status_for_billing_period()';
    RAISE NOTICE '  • cancel_nfse_invoice()';
    RAISE NOTICE '  • retry_failed_invoice()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Insert provider configuration with master token';
    RAISE NOTICE '  2. Add therapist CNPJ to therapist_nfse_config';
    RAISE NOTICE '  3. Implement backend API endpoints';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;