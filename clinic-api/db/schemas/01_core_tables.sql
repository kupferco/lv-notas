-- clinic-api/db/schemas/01_core_tables.sql
-- Core foundation tables: therapists and patients with basic types

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

-- Drop custom types if they exist
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;

-- Create custom types
CREATE TYPE session_status AS ENUM ('agendada', 'compareceu', 'cancelada');
CREATE TYPE event_type AS ENUM ('new', 'update', 'cancel');

-- =============================================================================
-- CORE FOUNDATION TABLES
-- =============================================================================

-- Drop core tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS therapists CASCADE;

-- Therapists with enhanced onboarding and billing features
CREATE TABLE therapists (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    google_calendar_id VARCHAR(255),
    -- Billing configuration
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'per_session', 'weekly', 'monthly', 'ad_hoc'
    default_session_price DECIMAL(10,2),
    income_tax_rate DECIMAL(5,2) DEFAULT 0.00, -- NEW: Taxa de imposto de renda (%)
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_started_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients with dual date system, CPF, address, and enhanced features
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14), -- Brazilian CPF field (format: XXX.XXX.XXX-XX)
    nota BOOLEAN DEFAULT false,
    preco DECIMAL(10,2),
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- CRITICAL: Dual date system
    therapy_start_date DATE, -- Historical (optional) - when therapy actually began
    lv_notas_billing_start_date DATE, -- LV Notas billing (required) - when to start counting sessions
    session_price DECIMAL(10,2), -- Override therapist default
    recurring_pattern VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', etc.
    notes TEXT, -- General patient notes
    
    -- NEW: Address fields for NFS-e invoicing
    endereco_rua VARCHAR(255),
    endereco_numero VARCHAR(20),
    endereco_bairro VARCHAR(100),
    endereco_codigo_municipio VARCHAR(10) DEFAULT '3550308',
    endereco_uf VARCHAR(2) DEFAULT 'SP',
    endereco_cep VARCHAR(10),
    
    -- NEW: Personal information
    data_nascimento DATE, -- Birth date
    genero VARCHAR(50), -- Gender
    
    -- NEW: Emergency contact
    contato_emergencia_nome VARCHAR(255), -- Emergency contact name
    contato_emergencia_telefone VARCHAR(20), -- Emergency contact phone
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- BASIC INDEXES FOR CORE TABLES
-- =============================================================================

-- Core table indexes
CREATE INDEX idx_patients_therapist_id ON patients(therapist_id);
CREATE INDEX idx_patients_therapist_billing ON patients(therapist_id, lv_notas_billing_start_date);

-- CPF index with unique constraint (allowing NULLs)
-- CREATE UNIQUE INDEX idx_patients_cpf ON patients(cpf) WHERE cpf IS NOT NULL; (NOT ANYMORE – I'm now allowing multiple patients to use the same CPF)

-- Email indexes for lookups
CREATE INDEX idx_therapists_email ON therapists(email);
CREATE INDEX idx_patients_email ON patients(email);

-- Address indexes for invoice generation
CREATE INDEX idx_patients_address ON patients(endereco_uf, endereco_codigo_municipio) WHERE endereco_rua IS NOT NULL;

-- =============================================================================
-- COMMENTS FOR CORE TABLES
-- =============================================================================

COMMENT ON COLUMN patients.therapy_start_date IS 'Historical date when therapy actually began (optional, for context only)';
COMMENT ON COLUMN patients.lv_notas_billing_start_date IS 'Date when LV Notas billing begins (required, affects billing calculations)';
COMMENT ON COLUMN patients.cpf IS 'Brazilian CPF (Cadastro de Pessoas Físicas) - format XXX.XXX.XXX-XX';
COMMENT ON COLUMN patients.endereco_rua IS 'Street address for NFS-e invoicing';
COMMENT ON COLUMN patients.endereco_numero IS 'Street number for NFS-e invoicing';
COMMENT ON COLUMN patients.endereco_bairro IS 'Neighborhood for NFS-e invoicing';
COMMENT ON COLUMN patients.endereco_codigo_municipio IS 'IBGE municipal code for NFS-e invoicing (default: 3550308 = São Paulo)';
COMMENT ON COLUMN patients.endereco_uf IS 'State code for NFS-e invoicing (default: SP)';
COMMENT ON COLUMN patients.endereco_cep IS 'Postal code for NFS-e invoicing';
COMMENT ON COLUMN patients.data_nascimento IS 'Patient birth date';
COMMENT ON COLUMN patients.genero IS 'Patient gender';
COMMENT ON COLUMN patients.contato_emergencia_nome IS 'Emergency contact name';
COMMENT ON COLUMN patients.contato_emergencia_telefone IS 'Emergency contact phone number';
COMMENT ON TABLE therapists IS 'Core therapist accounts with billing and onboarding configuration';
COMMENT ON TABLE patients IS 'Patient records with dual date system, CPF support, address for NFS-e, and emergency contact information';
COMMENT ON COLUMN therapists.income_tax_rate IS 'Taxa de imposto de renda sobre a receita bruta mensal (ex: 16.00 para 16%)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Core tables (therapists, patients) created successfully with enhanced features!';
    RAISE NOTICE 'New features:';
    RAISE NOTICE '  ✅ CPF field with Brazilian formatting (XXX.XXX.XXX-XX)';
    RAISE NOTICE '  ✅ Complete address fields for NFS-e invoicing';
    RAISE NOTICE '  ✅ Birth date and gender fields';
    RAISE NOTICE '  ✅ Emergency contact information';
    RAISE NOTICE '  ✅ Enhanced indexing for performance';
END $$;