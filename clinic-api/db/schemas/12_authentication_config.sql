-- clinic-api/db/schemas/12_authentication_config.sql
-- Authentication configuration management (dev/test vs production)

-- =============================================================================
-- AUTHENTICATION CONFIGURATION
-- =============================================================================

-- Add authentication configuration to existing app_configuration table
INSERT INTO app_configuration (key, value, description) VALUES 
(
    'auth_inactive_timeout_minutes',
    '10',
    'Minutes of inactivity before showing warning modal (PROD: 10, DEV: 2)'
),
(
    'auth_warning_timeout_minutes',
    '1',
    'Minutes to show in warning countdown before auto-logout (PROD: 1, DEV: 0.17 = 10sec)'
),
(
    'auth_max_session_hours',
    '8',
    'Maximum session duration in hours (PROD: 8, DEV: 1)'
),
(
    'auth_token_refresh_minutes',
    '55',
    'Minutes before token expiry to refresh (PROD: 55, DEV: 5)'
),
(
    'auth_environment',
    'production',
    'Current environment: production, development, testing'
),
(
    'auth_super_admin_enabled',
    'true',
    'Whether super admin role is enabled (can be disabled for security)'
),
(
    'auth_password_reset_expires_hours',
    '24',
    'Hours before password reset token expires'
),
(
    'auth_invitation_expires_days',
    '7',
    'Days before practice invitation expires'
),
(
    'auth_require_email_verification',
    'true',
    'Whether email verification is required for new accounts'
),
(
    'auth_session_cleanup_interval_minutes',
    '15',
    'How often to run expired session cleanup (background job)'
),
(
    'google_permissions_scopes',
    'https://www.googleapis.com/auth/calendar.readonly,email,profile',
    'Google OAuth scopes requested during setup'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- ENVIRONMENT-SPECIFIC CONFIGURATION FUNCTIONS
-- =============================================================================

-- Function to get authentication configuration with environment override
CREATE OR REPLACE FUNCTION get_auth_config(config_key VARCHAR(255))
RETURNS VARCHAR(255) AS $$
DECLARE
    config_value VARCHAR(255);
    environment VARCHAR(255);
BEGIN
    -- Get current environment
    SELECT value INTO environment 
    FROM app_configuration 
    WHERE key = 'auth_environment';
    
    -- Get base configuration value
    SELECT value INTO config_value 
    FROM app_configuration 
    WHERE key = config_key;
    
    -- Apply environment-specific overrides for development/testing
    IF environment IN ('development', 'testing') THEN
        CASE config_key
            WHEN 'auth_inactive_timeout_minutes' THEN
                config_value := '2'; -- 2 minutes instead of 10 for dev
            WHEN 'auth_warning_timeout_minutes' THEN
                config_value := '0.17'; -- 10 seconds instead of 1 minute for dev  
            WHEN 'auth_max_session_hours' THEN
                config_value := '1'; -- 1 hour instead of 8 for dev
            WHEN 'auth_token_refresh_minutes' THEN
                config_value := '5'; -- 5 minutes instead of 55 for dev
            WHEN 'auth_session_cleanup_interval_minutes' THEN
                config_value := '2'; -- 2 minutes instead of 15 for dev
            ELSE
                -- Keep production value for other settings
                NULL;
        END CASE;
    END IF;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- Function to set authentication environment (dev/test/prod)
CREATE OR REPLACE FUNCTION set_auth_environment(env VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    -- Validate environment
    IF env NOT IN ('production', 'development', 'testing') THEN
        RAISE EXCEPTION 'Invalid environment. Must be: production, development, or testing';
    END IF;
    
    -- Update environment setting
    UPDATE app_configuration 
    SET value = env, updated_at = CURRENT_TIMESTAMP 
    WHERE key = 'auth_environment';
    
    -- Log the environment change
    INSERT INTO session_activity_log (
        session_id, user_id, activity_type, metadata
    ) VALUES (
        NULL, NULL, 'environment_change',
        JSON_BUILD_OBJECT(
            'new_environment', env,
            'changed_at', CURRENT_TIMESTAMP,
            'changed_by', 'system'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get current authentication timeouts for session creation
CREATE OR REPLACE FUNCTION get_session_timeouts()
RETURNS TABLE(
    inactive_timeout_minutes INTEGER,
    warning_timeout_minutes NUMERIC,
    max_session_hours INTEGER,
    token_refresh_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_auth_config('auth_inactive_timeout_minutes')::INTEGER,
        get_auth_config('auth_warning_timeout_minutes')::NUMERIC,
        get_auth_config('auth_max_session_hours')::INTEGER,
        get_auth_config('auth_token_refresh_minutes')::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to quickly switch to development mode
CREATE OR REPLACE FUNCTION enable_dev_mode()
RETURNS TABLE(
    setting VARCHAR(255),
    production_value VARCHAR(255),
    development_value VARCHAR(255)
) AS $$
BEGIN
    -- Set environment to development
    PERFORM set_auth_environment('development');
    
    -- Return comparison of settings
    RETURN QUERY
    SELECT 
        config.key as setting,
        config.value as production_value,
        get_auth_config(config.key) as development_value
    FROM app_configuration config
    WHERE config.key LIKE 'auth_%'
    AND config.key != 'auth_environment'
    ORDER BY config.key;
END;
$$ LANGUAGE plpgsql;

-- Function to quickly switch to production mode
CREATE OR REPLACE FUNCTION enable_prod_mode()
RETURNS TABLE(
    setting VARCHAR(255),
    current_value VARCHAR(255)
) AS $$
BEGIN
    -- Set environment to production
    PERFORM set_auth_environment('production');
    
    -- Return current settings
    RETURN QUERY
    SELECT 
        config.key as setting,
        get_auth_config(config.key) as current_value
    FROM app_configuration config
    WHERE config.key LIKE 'auth_%'
    AND config.key != 'auth_environment'
    ORDER BY config.key;
END;
$$ LANGUAGE plpgsql;

-- Function to show current authentication configuration
CREATE OR REPLACE FUNCTION show_auth_config()
RETURNS TABLE(
    environment VARCHAR(255),
    setting VARCHAR(255),
    current_value VARCHAR(255),
    description TEXT
) AS $$
DECLARE
    current_env VARCHAR(255);
BEGIN
    -- Get current environment
    SELECT get_auth_config('auth_environment') INTO current_env;
    
    -- Return all auth settings with current values
    RETURN QUERY
    SELECT 
        current_env as environment,
        config.key as setting,
        get_auth_config(config.key) as current_value,
        config.description
    FROM app_configuration config
    WHERE config.key LIKE 'auth_%'
    OR config.key LIKE 'google_%'
    ORDER BY config.key;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- PRODUCTION SAFETY FUNCTIONS
-- =============================================================================

-- Function to disable super admin (for production security)
CREATE OR REPLACE FUNCTION disable_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE app_configuration 
    SET value = 'false', updated_at = CURRENT_TIMESTAMP 
    WHERE key = 'auth_super_admin_enabled';
    
    -- Deactivate existing super admin permissions (don't delete for audit)
    UPDATE user_permissions 
    SET is_active = false 
    WHERE role = 'super_admin';
    
    -- Log the change
    INSERT INTO session_activity_log (
        session_id, user_id, activity_type, metadata
    ) VALUES (
        NULL, NULL, 'super_admin_disabled',
        JSON_BUILD_OBJECT(
            'disabled_at', CURRENT_TIMESTAMP,
            'reason', 'production_security'
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to create super admin permission (restricted)
CREATE OR REPLACE FUNCTION grant_super_admin(
    p_user_email VARCHAR(255),
    p_granted_by_email VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    target_user_id INTEGER;
    granting_user_id INTEGER;
    super_admin_enabled BOOLEAN;
BEGIN
    -- Check if super admin is enabled
    SELECT get_auth_config('auth_super_admin_enabled')::BOOLEAN INTO super_admin_enabled;
    
    IF NOT super_admin_enabled THEN
        RAISE EXCEPTION 'Super admin role is disabled for security';
    END IF;
    
    -- Get user IDs
    SELECT id INTO target_user_id FROM user_credentials WHERE email = p_user_email;
    SELECT id INTO granting_user_id FROM user_credentials WHERE email = p_granted_by_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user not found: %', p_user_email;
    END IF;
    
    IF granting_user_id IS NULL THEN
        RAISE EXCEPTION 'Granting user not found: %', p_granted_by_email;
    END IF;
    
    -- Grant super admin to any practice (we'll use therapist_id = 1 as placeholder)
    INSERT INTO user_permissions (
        user_id, therapist_id, role, granted_by, notes
    ) VALUES (
        target_user_id,
        (SELECT MIN(id) FROM therapists), -- Use first therapist as placeholder
        'super_admin',
        granting_user_id,
        'Super admin access granted - can access all practices'
    )
    ON CONFLICT (user_id, therapist_id) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        granted_by = granting_user_id,
        granted_at = CURRENT_TIMESTAMP,
        notes = EXCLUDED.notes;
    
    -- Log the grant
    INSERT INTO session_activity_log (
        session_id, user_id, activity_type, metadata
    ) VALUES (
        NULL, granting_user_id, 'super_admin_granted',
        JSON_BUILD_OBJECT(
            'target_user', p_user_email,
            'granted_by', p_granted_by_email,
            'granted_at', CURRENT_TIMESTAMP
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR CONFIGURATION
-- =============================================================================

COMMENT ON FUNCTION get_auth_config IS 'Get authentication config with environment-specific overrides';
COMMENT ON FUNCTION set_auth_environment IS 'Switch between production/development/testing modes';
COMMENT ON FUNCTION get_session_timeouts IS 'Get current timeout values for session creation';
COMMENT ON FUNCTION enable_dev_mode IS 'Quick switch to development mode with shorter timeouts';
COMMENT ON FUNCTION enable_prod_mode IS 'Quick switch to production mode with full timeouts';
COMMENT ON FUNCTION show_auth_config IS 'Display current authentication configuration';
COMMENT ON FUNCTION disable_super_admin IS 'Disable super admin role for production security';
COMMENT ON FUNCTION grant_super_admin IS 'Grant super admin access (only when enabled)';

-- Success message
DO $$ BEGIN
    RAISE NOTICE '⚙️ Authentication configuration created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Environment-specific timeouts (dev vs prod)';
    RAISE NOTICE '  ✅ Quick mode switching functions';
    RAISE NOTICE '  ✅ Production safety controls';
    RAISE NOTICE '  ✅ Configurable session timeouts';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Configuration Commands:';
    RAISE NOTICE '  • SELECT * FROM show_auth_config();';
    RAISE NOTICE '  • SELECT * FROM enable_dev_mode();';
    RAISE NOTICE '  • SELECT * FROM enable_prod_mode();';
    RAISE NOTICE '  • SELECT disable_super_admin();';
    RAISE NOTICE '';
    RAISE NOTICE '⏱️ Current Timeouts:';
    RAISE NOTICE '  Production: 10min inactive, 1min warning, 8hr max';
    RAISE NOTICE '  Development: 2min inactive, 10sec warning, 1hr max';
END $$;