-- clinic-api/db/schemas/06_settings.sql
-- User preferences and settings tables

-- =============================================================================
-- SETTINGS TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS app_configuration CASCADE;
DROP TABLE IF EXISTS therapist_settings CASCADE;

-- Global app configuration table
CREATE TABLE app_configuration (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Therapist UI preferences and settings
CREATE TABLE therapist_settings (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    setting_key VARCHAR(50) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapist_id, setting_key)
);

-- =============================================================================
-- DEFAULT APP CONFIGURATION
-- =============================================================================

-- Insert default app configuration
INSERT INTO app_configuration (key, value, description) VALUES 
(
    'calendar_mode', 
    'read_only', 
    'Calendar integration mode: read_only or read_write'
),
(
    'app_version',
    '1.0.0',
    'Current application version'
),
(
    'default_session_duration',
    '60',
    'Default session duration in minutes'
),
(
    'calendar_sync_enabled',
    'true',
    'Whether calendar synchronization is enabled globally'
),
(
    'nfse_test_mode',
    'true',
    'Whether NFS-e invoices are generated in test/sandbox mode (true) or production (false)'
),
(
    'nfse_current_provider',
    'focus_nfe',
    'Currently active NFS-e provider identifier'
);

-- =============================================================================
-- DEFAULT SETTINGS FOR EXISTING THERAPISTS
-- =============================================================================

-- Insert default settings for existing therapists
INSERT INTO therapist_settings (therapist_id, setting_key, setting_value)
SELECT 
    t.id,
    'payment_mode',
    'simple'
FROM therapists t
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_settings ts 
    WHERE ts.therapist_id = t.id AND ts.setting_key = 'payment_mode'
);

INSERT INTO therapist_settings (therapist_id, setting_key, setting_value)
SELECT 
    t.id,
    'view_mode', 
    'card'
FROM therapists t
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_settings ts 
    WHERE ts.therapist_id = t.id AND ts.setting_key = 'view_mode'
);

INSERT INTO therapist_settings (therapist_id, setting_key, setting_value)
SELECT 
    t.id,
    'auto_check_in_mode',
    'false'
FROM therapists t
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_settings ts 
    WHERE ts.therapist_id = t.id AND ts.setting_key = 'auto_check_in_mode'
);

-- =============================================================================
-- INDEXES FOR SETTINGS
-- =============================================================================

CREATE INDEX idx_app_configuration_key ON app_configuration(key);
CREATE INDEX idx_therapist_settings_therapist_key ON therapist_settings(therapist_id, setting_key);

-- =============================================================================
-- COMMENTS FOR SETTINGS
-- =============================================================================

COMMENT ON TABLE app_configuration IS 'Global application configuration settings';
COMMENT ON TABLE therapist_settings IS 'Stores persistent UI preferences for each therapist';
COMMENT ON COLUMN therapist_settings.setting_key IS 'Setting name: payment_mode, view_mode, auto_check_in_mode, etc.';
COMMENT ON COLUMN therapist_settings.setting_value IS 'Setting value stored as string (parse as needed)';
COMMENT ON COLUMN app_configuration.key IS 'Global setting key: calendar_mode, app_version, nfse_*, etc.';
COMMENT ON COLUMN app_configuration.value IS 'Global setting value stored as string';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Settings and app configuration tables created successfully!';
    RAISE NOTICE 'NFS-e configuration added with provider-agnostic design.';
END $$;