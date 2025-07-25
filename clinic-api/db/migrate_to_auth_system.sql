-- clinic-api/db/migrate_to_auth_system.sql
-- PRODUCTION SAFE migration to new authentication system

\echo '🔐 Starting SAFE Authentication System Migration'
\echo '=============================================='
\echo ''

-- Set error handling
\set ON_ERROR_STOP on

\echo '📋 Step 1: Installing authentication tables...'
\i schemas/11_authentication_system.sql

\echo '⚙️ Step 2: Installing authentication configuration...'
\i schemas/12_authentication_config.sql

\echo '🔄 Step 3: Migrating existing therapists to new auth system...'

-- Run the safe migration for existing therapists
SELECT 
    '🏥 Migrating existing therapists...' as status;

-- Show before state
SELECT 
    'BEFORE Migration:' as summary,
    (SELECT COUNT(*) FROM therapists) as total_therapists,
    (SELECT COUNT(*) FROM user_credentials) as existing_user_credentials,
    (SELECT COUNT(*) FROM user_permissions) as existing_permissions;

-- Run the migration
SELECT * FROM migrate_existing_therapists_to_auth();

-- Show after state
SELECT 
    'AFTER Migration:' as summary,
    (SELECT COUNT(*) FROM therapists) as total_therapists,
    (SELECT COUNT(*) FROM user_credentials) as total_user_credentials,
    (SELECT COUNT(*) FROM user_permissions) as total_permissions,
    (SELECT COUNT(*) FROM user_permissions WHERE role = 'owner') as owner_permissions;

\echo ''
\echo '🎯 Step 4: Setting up your super admin access...'

-- Create super admin for you (if not exists)
DO $$
DECLARE
    dan_user_id INTEGER;
BEGIN
    -- Check if dan@kupfer.co exists in user_credentials
    SELECT id INTO dan_user_id 
    FROM user_credentials 
    WHERE email = 'dan@kupfer.co';
    
    IF dan_user_id IS NULL THEN
        -- Create user credential for dan@kupfer.co
        INSERT INTO user_credentials (
            email, password_hash, display_name, is_active, email_verified
        ) VALUES (
            'dan@kupfer.co',
            'temp_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::TEXT || '_' || RANDOM()::TEXT, -- Temporary password, will need reset
            'Dan Kupfer (Super Admin)',
            true,
            true -- Pre-verified
        ) RETURNING id INTO dan_user_id;
        
        RAISE NOTICE '✅ Created user credential for dan@kupfer.co (ID: %)', dan_user_id;
    ELSE
        RAISE NOTICE '✅ User credential already exists for dan@kupfer.co (ID: %)', dan_user_id;
    END IF;
    
    -- Grant super admin permission (use first therapist as placeholder)
    INSERT INTO user_permissions (
        user_id, therapist_id, role, granted_by, notes
    ) 
    SELECT 
        dan_user_id,
        t.id,
        'super_admin',
        dan_user_id,
        'Initial super admin setup for system owner'
    FROM therapists t
    ORDER BY t.id
    LIMIT 1
    ON CONFLICT (user_id, therapist_id) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        notes = 'Updated to super admin during migration';
    
    RAISE NOTICE '✅ Granted super admin permissions to dan@kupfer.co';
END $$;

\echo ''
\echo '🔧 Step 5: Showing current authentication configuration...'

-- Show current auth configuration
SELECT * FROM show_auth_config();

\echo ''
\echo '📊 Step 6: Migration summary...'

-- Comprehensive migration summary
SELECT 
    '📊 MIGRATION SUMMARY' as section,
    '' as details
UNION ALL
SELECT 
    '🏥 Therapists', 
    CONCAT(COUNT(*), ' total therapists')
FROM therapists
UNION ALL
SELECT 
    '👤 User Credentials', 
    CONCAT(COUNT(*), ' user accounts created')
FROM user_credentials
UNION ALL
SELECT 
    '🔑 Owner Permissions', 
    CONCAT(COUNT(*), ' therapists with owner access')
FROM user_permissions 
WHERE role = 'owner'
UNION ALL
SELECT 
    '⚡ Super Admin', 
    CONCAT(COUNT(*), ' super admin accounts')
FROM user_permissions 
WHERE role = 'super_admin'
UNION ALL
SELECT 
    '⚙️ Environment', 
    get_auth_config('auth_environment')
UNION ALL
SELECT 
    '⏱️ Inactive Timeout', 
    CONCAT(get_auth_config('auth_inactive_timeout_minutes'), ' minutes')
UNION ALL
SELECT 
    '🔄 Token Refresh', 
    CONCAT(get_auth_config('auth_token_refresh_minutes'), ' minutes');

\echo ''
\echo '✅ MIGRATION COMPLETED SUCCESSFULLY!'
\echo '==================================='
\echo ''
\echo '🎉 Your authentication system is ready!'
\echo ''
\echo '📝 Next Steps:'
\echo '1. All existing therapists have been migrated with temporary passwords'
\echo '2. They will need to use "Forgot Password" flow to set real passwords'
\echo '3. You (dan@kupfer.co) have super admin access'
\echo '4. Update your API endpoints to use new authentication'
\echo '5. Update frontend to use new login flow'
\echo ''
\echo '🔧 Useful Commands:'
\echo '• SELECT * FROM show_auth_config();'
\echo '• SELECT * FROM get_user_practices(user_id);'
\echo '• SELECT * FROM enable_dev_mode(); -- For development'
\echo '• SELECT * FROM enable_prod_mode(); -- For production'
\echo '• SELECT disable_super_admin(); -- Disable super admin for security'
\echo ''
\echo '⚠️  IMPORTANT: All migrated users need to reset their passwords!'
\echo '   They should use the "Forgot Password" flow on first login.'