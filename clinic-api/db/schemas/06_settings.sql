-- clinic-api/db/schemas/06_settings.sql
-- User preferences and settings tables

-- =============================================================================
-- SETTINGS TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS therapist_settings CASCADE;

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

CREATE INDEX idx_therapist_settings_therapist_key ON therapist_settings(therapist_id, setting_key);

-- =============================================================================
-- COMMENTS FOR SETTINGS
-- =============================================================================

COMMENT ON TABLE therapist_settings IS 'Stores persistent UI preferences for each therapist';
COMMENT ON COLUMN therapist_settings.setting_key IS 'Setting name: payment_mode, view_mode, auto_check_in_mode, etc.';
COMMENT ON COLUMN therapist_settings.setting_value IS 'Setting value stored as string (parse as needed)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Settings tables created successfully!';
END $$;