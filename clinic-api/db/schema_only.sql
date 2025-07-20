-- clinic-api/db/schema_only.sql
-- Complete database schema for LV Notas (WITHOUT seed data)
-- This file runs all schema files in the correct order, excluding seed data

\echo '🏥 LV Notas Schema-Only Installation'
\echo '===================================='
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

\echo '�� Installing monthly billing system...'
\i schemas/10_monthly_billing.sql

\echo ''
\echo '✅ Schema-only installation finished!'
\echo '🎉 LV Notas database schema is ready (no seed data)!'
\echo ''

-- Show final status
SELECT 
    'Schema Installation Summary' as summary,
    (SELECT COUNT(*) FROM therapists) as therapists,
    (SELECT COUNT(*) FROM patients) as patients,
    (SELECT COUNT(*) FROM sessions) as sessions,
    (SELECT COUNT(*) FROM app_configuration) as app_configs,
    NOW() as completed_at;
