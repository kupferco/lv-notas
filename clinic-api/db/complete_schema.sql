-- clinic-api/db/complete_schema.sql
-- Complete database schema for LV Notas
-- This file runs all schema files in the correct order

\echo '🏥 LV Notas Complete Schema Installation'
\echo '======================================='
\echo ''

-- Set error handling
\set ON_ERROR_STOP on

\echo '📋 Installing core tables (therapists, patients)...'
\i schemas/01_core_tables.sql

\echo '📅 Installing sessions and calendar tables...'
\i schemas/02_sessions_calendar.sql

\echo '🚀 Installing onboarding system...'
\i schemas/03_onboarding.sql

\echo '💰 Installing billing history tables...'
\i schemas/04_billing_history.sql

\echo '💳 Installing payment tracking tables...'
\i schemas/05_payments.sql

\echo '⚙️ Installing settings and app configuration...'
\i schemas/06_settings.sql

\echo '📊 Installing database views...'
\i schemas/07_views.sql

\echo '🔧 Installing helper functions...'
\i schemas/08_functions.sql

\echo '🌱 Installing seed data...'
\i schemas/09_seed_data.sql

\echo '💰 Installing monthly billing system...'
\i schemas/10_monthly_billing.sql

\echo ''
\echo '✅ Complete schema installation finished!'
\echo '🎉 LV Notas database is ready for use!'
\echo ''

-- Show final status
SELECT 
    'Installation Summary' as summary,
    (SELECT COUNT(*) FROM therapists) as therapists,
    (SELECT COUNT(*) FROM patients) as patients,
    (SELECT COUNT(*) FROM sessions) as sessions,
    (SELECT COUNT(*) FROM app_configuration) as app_configs,
    NOW() as completed_at;