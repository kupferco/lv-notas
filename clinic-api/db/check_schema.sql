-- clinic-api/db/check_schema.sql
-- Comprehensive schema verification for LV Notas database

\echo '============================================================================='
\echo 'LV NOTAS DATABASE SCHEMA CHECK'
\echo '============================================================================='

\echo ''
\echo '📊 TABLES OVERVIEW'
\echo '-------------------'
SELECT 
    table_name, 
    table_type,
    CASE 
        WHEN table_name IN ('therapists', 'patients', 'sessions', 'calendar_events', 'check_ins', 'calendar_webhooks') THEN '✅ Core'
        WHEN table_name IN ('therapist_onboarding', 'imported_calendar_events', 'patient_matching_candidates', 'recurring_session_templates') THEN '🎯 Onboarding'
        WHEN table_name IN ('therapist_billing_history', 'patient_billing_history', 'billing_periods') THEN '💰 Billing'
        WHEN table_type = 'VIEW' THEN '📋 View'
        ELSE '❓ Other'
    END as category
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY category, table_name;

\echo ''
\echo '🔗 FOREIGN KEY RELATIONSHIPS'
\echo '------------------------------'
SELECT 
    tc.table_name as "From Table", 
    kcu.column_name as "Column", 
    ccu.table_name as "References Table",
    ccu.column_name as "References Column"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '🔍 ENHANCED THERAPIST STRUCTURE'
\echo '--------------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name IN ('billing_cycle', 'default_session_price', 'onboarding_completed', 'onboarding_started_at', 'onboarding_completed_at') THEN '🆕 New'
        ELSE '📋 Original'
    END as status
FROM information_schema.columns 
WHERE table_name = 'therapists' 
ORDER BY ordinal_position;

\echo ''
\echo '👥 ENHANCED PATIENT STRUCTURE (with Dual Date System)'
\echo '-------------------------------------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name IN ('therapy_start_date', 'lv_notas_billing_start_date', 'session_price', 'recurring_pattern', 'notes') THEN '🆕 New'
        ELSE '📋 Original'
    END as status
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

\echo ''
\echo '📅 ENHANCED SESSION STRUCTURE (with Billing Tracking)'
\echo '-------------------------------------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name IN ('billable', 'billing_period', 'session_price', 'billing_cycle_used', 'created_during_onboarding', 'import_batch_id', 'billing_period_id') THEN '🆕 New'
        ELSE '📋 Original'
    END as status
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

\echo ''
\echo '📋 VIEWS AVAILABLE'
\echo '------------------'
SELECT 
    table_name as "View Name",
    CASE 
        WHEN table_name = 'billable_sessions' THEN 'Sessions that count for billing based on dual date system'
        WHEN table_name = 'current_billing_settings' THEN 'Current billing configuration for all patients'
        WHEN table_name = 'therapist_onboarding_progress' THEN 'Onboarding progress for all therapists'
        WHEN table_name = 'billing_change_history' THEN 'Complete history of billing changes'
        ELSE 'Other view'
    END as "Description"
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

\echo ''
\echo '⚙️ HELPER FUNCTIONS'
\echo '--------------------'
SELECT 
    routine_name as "Function Name",
    CASE 
        WHEN routine_name = 'get_billing_sessions_count' THEN 'Count billable sessions for patient/period'
        WHEN routine_name = 'extract_patient_name_from_summary' THEN 'Extract patient name from calendar event'
        WHEN routine_name = 'get_therapist_billing_cycle' THEN 'Get current billing cycle for therapist'
        WHEN routine_name = 'get_patient_billing_cycle' THEN 'Get current billing cycle for patient (with overrides)'
        WHEN routine_name = 'change_therapist_billing_cycle' THEN 'Change therapist billing with history'
        WHEN routine_name = 'change_patient_billing_cycle' THEN 'Change patient billing with history'
        ELSE 'Other function'
    END as "Purpose"
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

\echo ''
\echo '🚀 PERFORMANCE INDEXES'
\echo '-----------------------'
SELECT 
    tablename as "Table",
    indexname as "Index Name",
    CASE 
        WHEN indexname LIKE '%pkey' THEN '🔑 Primary Key'
        WHEN indexname LIKE 'idx_%billing%' THEN '💰 Billing Performance'
        WHEN indexname LIKE 'idx_%onboarding%' OR indexname LIKE 'idx_%imported%' OR indexname LIKE 'idx_%matching%' THEN '🎯 Onboarding Performance'
        WHEN indexname LIKE 'idx_%' THEN '⚡ Performance'
        ELSE '📋 Other'
    END as "Type"
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;

\echo ''
\echo '📊 DATA SUMMARY'
\echo '----------------'
SELECT 
    'Therapists' as "Table",
    COUNT(*) as "Records",
    SUM(CASE WHEN onboarding_completed THEN 1 ELSE 0 END) as "Onboarded"
FROM therapists
UNION ALL
SELECT 
    'Patients' as "Table",
    COUNT(*) as "Records",
    SUM(CASE WHEN lv_notas_billing_start_date IS NOT NULL THEN 1 ELSE 0 END) as "With Billing Start"
FROM patients
UNION ALL
SELECT 
    'Sessions' as "Table",
    COUNT(*) as "Records",
    SUM(CASE WHEN billable THEN 1 ELSE 0 END) as "Billable"
FROM sessions
UNION ALL
SELECT 
    'Onboarding Steps' as "Table",
    COUNT(*) as "Records",
    COUNT(DISTINCT therapist_id) as "Therapists"
FROM therapist_onboarding
UNION ALL
SELECT 
    'Billing History' as "Table",
    COUNT(*) as "Records",
    COUNT(DISTINCT therapist_id) as "Therapists"
FROM therapist_billing_history;

\echo ''
\echo '🔍 DUAL DATE SYSTEM CHECK'
\echo '--------------------------'
SELECT 
    p.nome as "Patient",
    t.nome as "Therapist",
    p.therapy_start_date as "Therapy Start (Historical)",
    p.lv_notas_billing_start_date as "LV Notas Billing Start",
    CASE 
        WHEN p.therapy_start_date IS NOT NULL AND p.lv_notas_billing_start_date IS NOT NULL 
        THEN p.lv_notas_billing_start_date - p.therapy_start_date || ' days'
        ELSE 'N/A'
    END as "Gap (Billing - Historical)"
FROM patients p
JOIN therapists t ON p.therapist_id = t.id
ORDER BY t.nome, p.nome;

\echo ''
\echo '💰 BILLING OVERVIEW'
\echo '--------------------'
SELECT * FROM current_billing_settings ORDER BY therapist_name, patient_name;

\echo ''
\echo '✅ SCHEMA CHECK COMPLETE!'
\echo '========================='
\echo 'If all sections show data, your schema is properly set up for:'
\echo '• Enhanced therapist onboarding with calendar import'
\echo '• Dual date system (historical vs billing start dates)'  
\echo '• Advanced billing cycle management with full history'
\echo '• Smart patient matching and recurring session detection'
\echo '• Complete audit trail for all billing changes'