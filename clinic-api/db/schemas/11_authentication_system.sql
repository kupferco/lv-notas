-- clinic-api/db/schemas/11_authentication_system.sql
-- Authentication and user management system (PRODUCTION SAFE - ADDS ONLY)

-- =============================================================================
-- USER AUTHENTICATION TABLES (NEW - SAFE TO ADD)
-- =============================================================================

-- Drop tables if they exist (for clean reinstall only)
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS practice_invitations CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS session_activity_log CASCADE;

-- Create user authentication enum types (safe creation)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'manager', 'viewer', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status_auth AS ENUM ('active', 'expired', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User credentials table (email/password authentication)
CREATE TABLE user_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    display_name VARCHAR(255) NOT NULL,
    
    -- Google permissions (one-time setup)
    google_permissions_granted BOOLEAN DEFAULT false,
    google_access_token TEXT, -- Encrypted storage
    google_refresh_token TEXT, -- Encrypted storage  
    google_token_expires_at TIMESTAMP WITH TIME ZONE,
    google_permissions_granted_at TIMESTAMP WITH TIME ZONE,
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Password reset
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Account tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- User permissions (role-based access to practices)
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_credentials(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    
    -- Permission tracking
    granted_by INTEGER REFERENCES user_credentials(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = no expiration
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    UNIQUE(user_id, therapist_id) -- One permission per user per practice
);

-- Active user sessions
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_credentials(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session configuration (configurable for dev/test vs production)
    inactive_timeout_minutes INTEGER DEFAULT 10, -- Configurable: 10 min prod, 2 min dev
    warning_timeout_minutes INTEGER DEFAULT 1,   -- Configurable: 1 min prod, 10 sec dev
    max_session_hours INTEGER DEFAULT 8,         -- Configurable: 8 hrs prod, 1 hr dev
    
    -- Session tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Session status
    status session_status_auth DEFAULT 'active',
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(100), -- 'logout', 'timeout', 'forced', 'token_refresh_failed'
    
    -- Client info
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255)
);

-- Practice invitations system
CREATE TABLE practice_invitations (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    invited_by INTEGER REFERENCES user_credentials(id) ON DELETE CASCADE,
    
    -- Invitation details
    invited_email VARCHAR(255) NOT NULL,
    invited_role user_role NOT NULL,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Message and permissions
    personal_message TEXT,
    permissions_description TEXT, -- Human-readable description of what this role can do
    
    -- Status tracking
    status invitation_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- Response tracking
    responded_at TIMESTAMP WITH TIME ZONE,
    accepted_by INTEGER REFERENCES user_credentials(id) ON DELETE SET NULL,
    decline_reason TEXT
);

-- Session activity log (for security and debugging)
CREATE TABLE session_activity_log (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES user_credentials(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'activity', 'warning_shown', 'session_extended', 'logout', 'timeout'
    endpoint VARCHAR(255), -- API endpoint accessed
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional data
    metadata JSONB DEFAULT '{}' -- Store additional activity data
);

-- =============================================================================
-- INDEXES FOR AUTHENTICATION SYSTEM
-- =============================================================================

-- User credentials indexes
CREATE INDEX idx_user_credentials_email ON user_credentials(email);
CREATE INDEX idx_user_credentials_active ON user_credentials(is_active);
CREATE INDEX idx_user_credentials_verification ON user_credentials(email_verification_token);
CREATE INDEX idx_user_credentials_password_reset ON user_credentials(password_reset_token);

-- User permissions indexes
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_therapist_id ON user_permissions(therapist_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(user_id, is_active);
CREATE INDEX idx_user_permissions_role ON user_permissions(therapist_id, role, is_active);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, status);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity_at);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Practice invitations indexes
CREATE INDEX idx_practice_invitations_therapist ON practice_invitations(therapist_id);
CREATE INDEX idx_practice_invitations_email ON practice_invitations(invited_email);
CREATE INDEX idx_practice_invitations_token ON practice_invitations(invitation_token);
CREATE INDEX idx_practice_invitations_status ON practice_invitations(status, expires_at);

-- Session activity log indexes
CREATE INDEX idx_session_activity_log_session ON session_activity_log(session_id);
CREATE INDEX idx_session_activity_log_user ON session_activity_log(user_id);
CREATE INDEX idx_session_activity_log_timestamp ON session_activity_log(timestamp);
CREATE INDEX idx_session_activity_log_activity_type ON session_activity_log(activity_type);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to user_credentials
CREATE TRIGGER update_user_credentials_updated_at 
    BEFORE UPDATE ON user_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUTHENTICATION HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user has permission for a practice
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id INTEGER,
    p_therapist_id INTEGER,
    p_required_role user_role DEFAULT 'viewer'
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_level INTEGER;
    required_role_level INTEGER;
BEGIN
    -- Define role hierarchy (higher number = more permissions)
    SELECT CASE 
        WHEN up.role = 'super_admin' THEN 4
        WHEN up.role = 'owner' THEN 3
        WHEN up.role = 'manager' THEN 2
        WHEN up.role = 'viewer' THEN 1
        ELSE 0
    END INTO user_role_level
    FROM user_permissions up
    WHERE up.user_id = p_user_id 
    AND up.therapist_id = p_therapist_id
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP);
    
    -- If user not found, check for super_admin on any practice
    IF user_role_level IS NULL THEN
        SELECT CASE 
            WHEN up.role = 'super_admin' THEN 4
            ELSE 0
        END INTO user_role_level
        FROM user_permissions up
        WHERE up.user_id = p_user_id 
        AND up.role = 'super_admin'
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        LIMIT 1;
    END IF;
    
    -- Get required role level
    required_role_level := CASE 
        WHEN p_required_role = 'super_admin' THEN 4
        WHEN p_required_role = 'owner' THEN 3
        WHEN p_required_role = 'manager' THEN 2
        WHEN p_required_role = 'viewer' THEN 1
        ELSE 0
    END;
    
    RETURN COALESCE(user_role_level, 0) >= required_role_level;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's practices
CREATE OR REPLACE FUNCTION get_user_practices(p_user_id INTEGER)
RETURNS TABLE(
    therapist_id INTEGER,
    therapist_name VARCHAR(255),
    therapist_email VARCHAR(255),
    user_role user_role,
    granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as therapist_id,
        t.nome as therapist_name,
        t.email as therapist_email,
        up.role as user_role,
        up.granted_at
    FROM user_permissions up
    JOIN therapists t ON up.therapist_id = t.id
    WHERE up.user_id = p_user_id
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    ORDER BY up.granted_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to extend user session
CREATE OR REPLACE FUNCTION extend_user_session(p_session_token VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get session details
    SELECT * INTO session_record
    FROM user_sessions 
    WHERE session_token = p_session_token 
    AND status = 'active'
    AND expires_at > CURRENT_TIMESTAMP;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update session activity and extend expiration
    UPDATE user_sessions 
    SET 
        last_activity_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour' * session_record.max_session_hours
    WHERE id = session_record.id;
    
    -- Log the session extension
    INSERT INTO session_activity_log (
        session_id, user_id, activity_type, metadata
    ) VALUES (
        session_record.id, session_record.user_id, 'session_extended',
        JSON_BUILD_OBJECT('extended_at', CURRENT_TIMESTAMP)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to terminate expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Terminate expired sessions
    UPDATE user_sessions 
    SET 
        status = 'expired',
        terminated_at = CURRENT_TIMESTAMP,
        termination_reason = 'timeout'
    WHERE status = 'active' 
    AND (
        expires_at < CURRENT_TIMESTAMP 
        OR last_activity_at < CURRENT_TIMESTAMP - INTERVAL '1 minute' * inactive_timeout_minutes
    );
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO session_activity_log (
        session_id, user_id, activity_type, metadata
    )
    SELECT 
        us.id, us.user_id, 'cleanup_expired',
        JSON_BUILD_OBJECT('expired_count', expired_count, 'cleanup_time', CURRENT_TIMESTAMP)
    FROM user_sessions us 
    WHERE us.status = 'expired' 
    AND us.terminated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
    LIMIT 1; -- Just log once per cleanup
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAFE MIGRATION: LINK EXISTING THERAPISTS TO NEW AUTH SYSTEM
-- =============================================================================

-- This function safely migrates existing therapists to the new auth system
-- WITHOUT deleting or modifying existing data
CREATE OR REPLACE FUNCTION migrate_existing_therapists_to_auth()
RETURNS TABLE(
    therapist_id INTEGER,
    therapist_email VARCHAR(255),
    created_user_id INTEGER,
    migration_status VARCHAR(50)
) AS $$
DECLARE
    therapist_record RECORD;
    new_user_id_var INTEGER;
    temp_password VARCHAR(255);
    permission_exists BOOLEAN;
BEGIN
    -- Iterate through existing therapists who don't have user credentials yet
    FOR therapist_record IN 
        SELECT t.id, t.email, t.nome 
        FROM therapists t 
        WHERE t.email IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM user_permissions up 
            JOIN user_credentials uc ON up.user_id = uc.id 
            WHERE up.therapist_id = t.id AND uc.email = t.email
        )
    LOOP
        -- Generate temporary password (they'll need to reset it)
        temp_password := 'temp_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::TEXT || '_' || RANDOM()::TEXT;
        
        -- Create user credential (or get existing)
        INSERT INTO user_credentials (
            email, password_hash, display_name, is_active, email_verified
        ) VALUES (
            therapist_record.email, 
            temp_password, -- They'll need to set real password via reset flow
            therapist_record.nome,
            true,
            false -- Require email verification
        )
        ON CONFLICT (email) DO UPDATE SET
            display_name = EXCLUDED.display_name
        RETURNING id INTO new_user_id_var;
        
        -- If no new user was created, get existing one
        IF new_user_id_var IS NULL THEN
            SELECT id INTO new_user_id_var 
            FROM user_credentials 
            WHERE email = therapist_record.email;
        END IF;
        
        -- Check if permission already exists using table alias
        SELECT EXISTS(
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = new_user_id_var AND up.therapist_id = therapist_record.id
        ) INTO permission_exists;
        
        -- Grant owner permissions only if they don't exist
        IF NOT permission_exists THEN
            INSERT INTO user_permissions (
                user_id, therapist_id, role, granted_by, notes
            ) VALUES (
                new_user_id_var,
                therapist_record.id,
                'owner',
                new_user_id_var, -- Self-granted during migration
                'Migrated from existing therapist account'
            );
        END IF;
        
        -- Return migration result
        RETURN QUERY SELECT 
            therapist_record.id,
            therapist_record.email,
            new_user_id_var,
            'migrated'::VARCHAR(50);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR AUTHENTICATION SYSTEM
-- =============================================================================

COMMENT ON TABLE user_credentials IS 'User authentication with email/password and Google permissions';
COMMENT ON TABLE user_permissions IS 'Role-based access control for practices';
COMMENT ON TABLE user_sessions IS 'Active user sessions with configurable timeouts';
COMMENT ON TABLE practice_invitations IS 'Invitation system for adding users to practices';
COMMENT ON TABLE session_activity_log IS 'Security and activity tracking for sessions';

COMMENT ON COLUMN user_sessions.inactive_timeout_minutes IS 'Configurable: 10 min prod, 2 min dev';
COMMENT ON COLUMN user_sessions.warning_timeout_minutes IS 'Configurable: 1 min prod, 10 sec dev';
COMMENT ON COLUMN user_sessions.max_session_hours IS 'Configurable: 8 hrs prod, 1 hr dev';

COMMENT ON FUNCTION user_has_permission IS 'Check if user has required role for practice (supports super_admin)';
COMMENT ON FUNCTION get_user_practices IS 'Get all practices user has access to with their roles';
COMMENT ON FUNCTION extend_user_session IS 'Extend session when user chooses to continue';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Background job to clean up expired sessions';
COMMENT ON FUNCTION migrate_existing_therapists_to_auth IS 'SAFE migration for existing therapists';

-- Success message
DO $$ BEGIN
    RAISE NOTICE '🔐 Authentication system created successfully!';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✅ Email/password authentication';
    RAISE NOTICE '  ✅ One-time Google permissions setup';
    RAISE NOTICE '  ✅ Configurable session timeouts (dev/test vs prod)';
    RAISE NOTICE '  ✅ Role-based access control (owner/manager/viewer/super_admin)';
    RAISE NOTICE '  ✅ Practice invitation system';
    RAISE NOTICE '  ✅ Activity tracking and security logging';
    RAISE NOTICE '  ✅ Safe migration for existing therapists';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ Next steps:';
    RAISE NOTICE '  1. Run: SELECT * FROM migrate_existing_therapists_to_auth();';
    RAISE NOTICE '  2. Update API endpoints for new authentication';
    RAISE NOTICE '  3. Update frontend for new login flow';
END $$;