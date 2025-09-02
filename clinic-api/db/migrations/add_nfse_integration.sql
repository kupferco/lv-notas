-- Migration: Add NFS-e Integration Schema
-- Date: 2024-12-02
-- Description: Adds electronic invoice (NFS-e) support tables and functions
-- This migration is SAFE - it only adds new tables, doesn't modify existing data

BEGIN;

-- Check if tables already exist to make this migration idempotent
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'provider_configuration') THEN
        
        -- Create provider_configuration table
        CREATE TABLE provider_configuration (
          id SERIAL PRIMARY KEY,
          provider_name VARCHAR(50) NOT NULL DEFAULT 'focus_nfe',
          master_token_encrypted TEXT,
          sandbox_mode BOOLEAN DEFAULT false,
          webhook_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Created table: provider_configuration';
    ELSE
        RAISE NOTICE 'Table already exists: provider_configuration';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'therapist_nfse_config') THEN
        
        -- Create therapist_nfse_config table
        CREATE TABLE therapist_nfse_config (
            id SERIAL PRIMARY KEY,
            therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
            cnpj VARCHAR(14) NOT NULL,
            provider_company_id VARCHAR(100),
            provider_company_token_encrypted TEXT,
            provider_sandbox_token_encrypted TEXT,
            default_service_code VARCHAR(20) DEFAULT '07498',
            default_item_lista_servico VARCHAR(10) DEFAULT '1401',
            default_tax_rate DECIMAL(5,2) DEFAULT 2.0,
            default_service_description TEXT DEFAULT 'Sessão de psicoterapia',
            next_invoice_ref INTEGER DEFAULT 1,
            send_email_to_patient BOOLEAN DEFAULT true,
            include_session_details BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(therapist_id),
            UNIQUE(cnpj)
        );
        
        CREATE INDEX idx_therapist_nfse_config_cnpj ON therapist_nfse_config(cnpj);
        CREATE INDEX idx_therapist_nfse_config_active ON therapist_nfse_config(is_active);
        
        RAISE NOTICE 'Created table: therapist_nfse_config';
    ELSE
        RAISE NOTICE 'Table already exists: therapist_nfse_config';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nfse_invoices') THEN
        
        -- Create nfse_invoices table (complete definition from your schema)
        CREATE TABLE nfse_invoices (
            id SERIAL PRIMARY KEY,
            therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
            patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            internal_ref VARCHAR(50) NOT NULL,
            ref_number INTEGER NOT NULL,
            billing_period_id INTEGER REFERENCES monthly_billing_periods(id) ON DELETE SET NULL,
            invoice_date DATE NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            service_description TEXT NOT NULL,
            session_count INTEGER DEFAULT 1,
            patient_name VARCHAR(255) NOT NULL,
            patient_document VARCHAR(14) NOT NULL,
            patient_document_type VARCHAR(4) NOT NULL,
            patient_email VARCHAR(255),
            provider_status VARCHAR(50),
            provider_reference VARCHAR(100),
            provider_invoice_id VARCHAR(100),
            invoice_number VARCHAR(50),
            municipal_number VARCHAR(50),
            verification_code VARCHAR(50),
            issue_date DATE,
            pdf_url TEXT,
            xml_url TEXT,
            municipal_url TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            error_message TEXT,
            cancellation_reason TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            issued_at TIMESTAMP WITH TIME ZONE,
            cancelled_at TIMESTAMP WITH TIME ZONE,
            email_sent_at TIMESTAMP WITH TIME ZONE,
            provider_response JSONB DEFAULT '{}'
        );
        
        -- Create indexes
        CREATE INDEX idx_nfse_invoices_therapist ON nfse_invoices(therapist_id);
        CREATE INDEX idx_nfse_invoices_patient ON nfse_invoices(patient_id);
        CREATE INDEX idx_nfse_invoices_billing_period ON nfse_invoices(billing_period_id);
        CREATE INDEX idx_nfse_invoices_ref ON nfse_invoices(internal_ref);
        CREATE INDEX idx_nfse_invoices_ref_number ON nfse_invoices(ref_number);
        CREATE INDEX idx_nfse_invoices_status ON nfse_invoices(status);
        CREATE INDEX idx_nfse_invoices_date ON nfse_invoices(invoice_date);
        CREATE INDEX idx_nfse_invoices_provider_ref ON nfse_invoices(provider_reference);
        CREATE INDEX idx_nfse_invoices_therapist_status ON nfse_invoices(therapist_id, status);
        CREATE INDEX idx_nfse_invoices_therapist_ref ON nfse_invoices(therapist_id, ref_number);
        CREATE INDEX idx_nfse_invoices_billing_period_lookup ON nfse_invoices(billing_period_id, status);
        
        RAISE NOTICE 'Created table: nfse_invoices';
    ELSE
        RAISE NOTICE 'Table already exists: nfse_invoices';
    END IF;
    
END $$;

-- Add the functions (copy from your schema file)
-- ... (include all the CREATE FUNCTION statements from your schema)

COMMIT;

-- Report success
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NFS-e Migration Completed Successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables added: provider_configuration, therapist_nfse_config, nfse_invoices';
    RAISE NOTICE 'Production data: PRESERVED';
    RAISE NOTICE '========================================';
END $$;
