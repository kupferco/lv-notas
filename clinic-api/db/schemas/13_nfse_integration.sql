-- clinic-api/db/schemas/13_nfse_integration_simplified.sql
-- Simplified NFS-e integration - Focus NFe as single source of truth for company data

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
-- CORE TABLES - SIMPLIFIED ARCHITECTURE
-- =============================================================================

-- Provider configuration (Focus NFE master settings only)
CREATE TABLE provider_configuration (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL DEFAULT 'focus_nfe',
  master_token_encrypted TEXT, -- Your master API token
  sandbox_mode BOOLEAN DEFAULT true, -- Default to safe sandbox mode
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Minimal therapist NFS-e configuration
-- PRINCIPLE: Only store what we can't get from Focus NFe
CREATE TABLE therapist_nfse_config (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- ONLY identifier needed - Focus NFe stores everything else via CNPJ
    company_cnpj VARCHAR(14) NOT NULL, -- Unformatted: 00000000000000
    focus_nfe_company_id VARCHAR(100),
    
    -- Certificate status tracking (certificates stored in Focus NFe)
    certificate_uploaded BOOLEAN DEFAULT false,
    certificate_uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Invoice preferences (local business logic only)
    default_service_code VARCHAR(20) DEFAULT '07498', -- SP psychology code
    default_item_lista_servico VARCHAR(10) DEFAULT '1401', -- ABRASF code
    default_tax_rate DECIMAL(5,2) DEFAULT 2.0, -- ISS rate for health services
    default_service_description TEXT DEFAULT 'Sessão de psicoterapia',
    
    -- Invoice counter for our reference system
    next_invoice_ref INTEGER DEFAULT 1, -- For generating LV-1, LV-2, etc.
    
    -- Feature preferences (local UI behavior)
    send_email_to_patient BOOLEAN DEFAULT true,
    include_session_details BOOLEAN DEFAULT true, -- Add dates in description
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(therapist_id),
    UNIQUE(company_cnpj)
);

-- NFS-e invoice records (our audit trail)
CREATE TABLE nfse_invoices (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Our reference system for tracking and retrieval
    internal_ref VARCHAR(50) NOT NULL UNIQUE, -- Format: LV-1, LV-2, etc.
    ref_number INTEGER NOT NULL, -- The numeric part for ordering
    
    -- Link to billing period
    billing_period_id INTEGER REFERENCES monthly_billing_periods(id) ON DELETE SET NULL,
    
    -- Invoice data we sent to provider
    invoice_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    service_description TEXT NOT NULL,
    session_count INTEGER DEFAULT 1,
    
    -- Patient data snapshot (for historical record)
    patient_name VARCHAR(255) NOT NULL,
    patient_document VARCHAR(14) NOT NULL, -- CPF or CNPJ
    patient_document_type VARCHAR(4) NOT NULL, -- 'cpf' or 'cnpj'
    patient_email VARCHAR(255),
    
    -- Provider integration data
    provider_reference VARCHAR(100) NOT NULL, -- The ref we sent (same as internal_ref)
    provider_invoice_id VARCHAR(100), -- Provider's internal ID
    provider_status VARCHAR(50), -- Raw status from provider
    
    -- Municipal data (from provider response)
    invoice_number VARCHAR(50), -- Official invoice number for display
    municipal_number VARCHAR(50), -- Official municipal number
    verification_code VARCHAR(50), -- Municipal verification code
    issue_date DATE, -- Date invoice was actually issued
    
    -- URLs from provider (dynamic - may expire)
    pdf_url TEXT,
    xml_url TEXT,
    municipal_url TEXT, -- URL to verify on municipality website
    
    -- Status tracking (our normalized status)
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, issued, cancelled, error
    error_message TEXT,
    cancellation_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    issued_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Provider raw response (for debugging and future data extraction)
    provider_response JSONB DEFAULT '{}'
);

-- =============================================================================
-- INDEXES - OPTIMIZED FOR COMMON QUERIES
-- =============================================================================

-- Therapist config lookups
CREATE INDEX idx_therapist_nfse_config_cnpj ON therapist_nfse_config(company_cnpj);
CREATE INDEX idx_therapist_nfse_config_therapist ON therapist_nfse_config(therapist_id);
CREATE INDEX idx_therapist_nfse_config_active ON therapist_nfse_config(therapist_id, is_active);

-- Invoice lookups (most common queries)
CREATE INDEX idx_nfse_invoices_therapist_status ON nfse_invoices(therapist_id, status);
CREATE INDEX idx_nfse_invoices_billing_period ON nfse_invoices(billing_period_id);
CREATE INDEX idx_nfse_invoices_ref ON nfse_invoices(internal_ref);
CREATE INDEX idx_nfse_invoices_provider_ref ON nfse_invoices(provider_reference);
CREATE INDEX idx_nfse_invoices_date ON nfse_invoices(invoice_date DESC);

-- =============================================================================
-- VIEWS - SIMPLIFIED FOR FRONTEND
-- =============================================================================

-- Single view for all billing period invoice queries
CREATE OR REPLACE VIEW v_billing_period_invoices AS
SELECT 
  bp.id AS billing_period_id,
  bp.patient_id,
  bp.therapist_id,
  bp.billing_year,
  bp.billing_month,
  bp.status AS billing_status,
  bp.total_amount AS billing_amount,
  
  -- Invoice info (null if no invoice exists)
  ni.id AS invoice_id,
  ni.internal_ref,
  ni.status AS invoice_status,
  ni.invoice_number,
  ni.municipal_number,
  ni.issue_date,
  ni.amount AS invoice_amount,
  ni.error_message,
  ni.cancellation_reason,
  ni.pdf_url,
  ni.xml_url,
  ni.created_at AS invoice_created_at,
  ni.issued_at AS invoice_issued_at,
  ni.cancelled_at AS invoice_cancelled_at
FROM monthly_billing_periods bp
LEFT JOIN nfse_invoices ni ON ni.billing_period_id = bp.id
  AND ni.status != 'superseded' -- Exclude old retry attempts
WHERE bp.status = 'paid'; -- Only show for paid billing periods

-- =============================================================================
-- FUNCTIONS - FOCUSED ON CORE OPERATIONS
-- =============================================================================

-- Generate next invoice reference (simple LV-X format)
CREATE OR REPLACE FUNCTION get_next_invoice_ref(p_therapist_id INTEGER) 
RETURNS TABLE(ref VARCHAR, ref_number INTEGER) AS $$
DECLARE
    v_next_number INTEGER;
    v_ref VARCHAR;
BEGIN
    -- Atomic increment and return
    UPDATE therapist_nfse_config 
    SET next_invoice_ref = next_invoice_ref + 1
    WHERE therapist_id = p_therapist_id
    RETURNING next_invoice_ref - 1 INTO v_next_number;
    
    IF v_next_number IS NULL THEN
        RAISE EXCEPTION 'Therapist % not configured for NFS-e', p_therapist_id;
    END IF;
    
    v_ref := 'LV-' || v_next_number;
    
    RETURN QUERY SELECT v_ref, v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Get latest invoice for billing period (most common frontend query)
CREATE OR REPLACE FUNCTION get_invoice_status_for_billing_period(p_billing_period_id INTEGER)
RETURNS TABLE (
  invoice_id INTEGER,
  internal_ref VARCHAR,
  status VARCHAR,
  invoice_number VARCHAR,
  issue_date DATE,
  amount DECIMAL,
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
    ni.internal_ref,
    ni.status,
    ni.invoice_number,
    ni.issue_date,
    ni.amount,
    ni.error_message,
    ni.cancellation_reason,
    ni.pdf_url,
    ni.xml_url,
    ni.municipal_number
  FROM nfse_invoices ni
  WHERE ni.billing_period_id = p_billing_period_id
    AND ni.status != 'superseded'
  ORDER BY ni.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Cancel invoice with reason tracking
CREATE OR REPLACE FUNCTION cancel_nfse_invoice(
  p_invoice_id INTEGER,
  p_reason TEXT DEFAULT 'Cancelamento solicitado pelo usuário'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status VARCHAR;
BEGIN
  -- Check if cancellation is allowed
  SELECT status INTO v_current_status
  FROM nfse_invoices
  WHERE id = p_invoice_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;
  
  IF v_current_status NOT IN ('issued', 'processing') THEN
    RAISE EXCEPTION 'Invoice cannot be cancelled - current status: %', v_current_status;
  END IF;
  
  -- Update to cancelled status
  UPDATE nfse_invoices
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_invoice_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Retry failed invoice (mark old as superseded, create new with fresh reference)
CREATE OR REPLACE FUNCTION retry_failed_invoice(p_billing_period_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_new_ref VARCHAR;
  v_new_ref_number INTEGER;
  v_therapist_id INTEGER;
  v_old_invoice RECORD;
  v_new_invoice_id INTEGER;
BEGIN
  -- Get the failed invoice data
  SELECT * INTO v_old_invoice
  FROM nfse_invoices
  WHERE billing_period_id = p_billing_period_id
    AND status = 'error'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_old_invoice IS NULL THEN
    RAISE EXCEPTION 'No failed invoice found for billing period %', p_billing_period_id;
  END IF;
  
  -- Mark old invoice as superseded
  UPDATE nfse_invoices 
  SET status = 'superseded', updated_at = CURRENT_TIMESTAMP
  WHERE id = v_old_invoice.id;
  
  -- Get new reference number
  SELECT ref, ref_number INTO v_new_ref, v_new_ref_number
  FROM get_next_invoice_ref(v_old_invoice.therapist_id);
  
  -- Create new invoice record
  INSERT INTO nfse_invoices (
    therapist_id, patient_id, billing_period_id,
    internal_ref, ref_number, provider_reference,
    invoice_date, amount, service_description, session_count,
    patient_name, patient_document, patient_document_type, patient_email,
    status, retry_count
  ) VALUES (
    v_old_invoice.therapist_id, v_old_invoice.patient_id, v_old_invoice.billing_period_id,
    v_new_ref, v_new_ref_number, v_new_ref, -- provider_reference = internal_ref
    CURRENT_DATE, v_old_invoice.amount, v_old_invoice.service_description, v_old_invoice.session_count,
    v_old_invoice.patient_name, v_old_invoice.patient_document, 
    v_old_invoice.patient_document_type, v_old_invoice.patient_email,
    'pending', v_old_invoice.retry_count + 1
  )
  RETURNING id INTO v_new_invoice_id;
  
  RETURN v_new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS - MINIMAL SET
-- =============================================================================

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
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
-- SEED DATA - BASIC CONFIGURATION
-- =============================================================================

-- Insert default provider configuration
INSERT INTO provider_configuration (provider_name, sandbox_mode) 
VALUES ('focus_nfe', true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE provider_configuration IS 'Focus NFe master API configuration';
COMMENT ON TABLE therapist_nfse_config IS 'Minimal local config - Focus NFe stores company data via CNPJ';
COMMENT ON TABLE nfse_invoices IS 'Invoice audit trail with Focus NFe integration';

COMMENT ON COLUMN therapist_nfse_config.company_cnpj IS 'CNPJ identifier - all company data fetched dynamically from Focus NFe';
COMMENT ON COLUMN therapist_nfse_config.next_invoice_ref IS 'Counter for LV-1, LV-2, etc. references';
COMMENT ON COLUMN nfse_invoices.internal_ref IS 'Our tracking reference (LV-X) - also sent as provider_reference';
COMMENT ON COLUMN nfse_invoices.provider_response IS 'Full Focus NFe response for debugging';

-- =============================================================================
-- ARCHITECTURE NOTES
-- =============================================================================

DO $$ BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'NFS-e Integration Schema - Simplified Architecture';
    RAISE NOTICE '=========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'PRINCIPLE: Focus NFe is single source of truth for:';
    RAISE NOTICE '  • Company data (name, address, municipal registration)';
    RAISE NOTICE '  • Digital certificates';
    RAISE NOTICE '  • Company tokens';
    RAISE NOTICE '';
    RAISE NOTICE 'WE ONLY STORE LOCALLY:';
    RAISE NOTICE '  • CNPJ (identifier for Focus NFe lookups)';
    RAISE NOTICE '  • Invoice preferences (service codes, tax rates)';
    RAISE NOTICE '  • Invoice counter (LV-1, LV-2, LV-3...)';
    RAISE NOTICE '  • Invoice audit trail';
    RAISE NOTICE '';
    RAISE NOTICE 'BENEFITS:';
    RAISE NOTICE '  ✓ No data sync conflicts';
    RAISE NOTICE '  ✓ Always current company data';
    RAISE NOTICE '  ✓ Simplified updates';
    RAISE NOTICE '  ✓ Single source of truth';
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES CREATED:';
    RAISE NOTICE '  • provider_configuration (Focus NFe settings)';
    RAISE NOTICE '  • therapist_nfse_config (CNPJ + preferences only)';
    RAISE NOTICE '  • nfse_invoices (audit trail)';
    RAISE NOTICE '';
    RAISE NOTICE 'KEY FUNCTIONS:';
    RAISE NOTICE '  • get_next_invoice_ref() - Generate LV-X references';
    RAISE NOTICE '  • get_invoice_status_for_billing_period() - Frontend queries';
    RAISE NOTICE '  • cancel_nfse_invoice() - Cancel with reason tracking';
    RAISE NOTICE '  • retry_failed_invoice() - Retry with new reference';
    RAISE NOTICE '';
    RAISE NOTICE '=========================================================';
END $$;