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
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_started_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients with dual date system and enhanced features
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    nota BOOLEAN DEFAULT false,
    preco DECIMAL(10,2),
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    -- CRITICAL: Dual date system
    therapy_start_date DATE, -- Historical (optional) - when therapy actually began
    lv_notas_billing_start_date DATE, -- LV Notas billing (required) - when to start counting sessions
    session_price DECIMAL(10,2), -- Override therapist default
    recurring_pattern VARCHAR(50), -- 'weekly', 'bi-weekly', 'monthly', etc.
    notes TEXT, -- General patient notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- BASIC INDEXES FOR CORE TABLES
-- =============================================================================

-- Core table indexes
CREATE INDEX idx_patients_therapist_id ON patients(therapist_id);
CREATE INDEX idx_patients_therapist_billing ON patients(therapist_id, lv_notas_billing_start_date);

-- =============================================================================
-- COMMENTS FOR CORE TABLES
-- =============================================================================

COMMENT ON COLUMN patients.therapy_start_date IS 'Historical date when therapy actually began (optional, for context only)';
COMMENT ON COLUMN patients.lv_notas_billing_start_date IS 'Date when LV Notas billing begins (required, affects billing calculations)';
COMMENT ON TABLE therapists IS 'Core therapist accounts with billing and onboarding configuration';
COMMENT ON TABLE patients IS 'Patient records with dual date system for therapy vs billing tracking';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Core tables (therapists, patients) created successfully!';
END $$;