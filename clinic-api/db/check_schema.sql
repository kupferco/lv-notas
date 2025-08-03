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
        WHEN table_name IN ('bank_connections', 'bank_transactions', 'payment_matches') THEN '🏦 Banking'
        WHEN table_name IN ('therapist_nfse_config', 'nfse_invoices') THEN '🧾 NFS-e'
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
\echo '🏦 BANKING INTEGRATION STRUCTURE'
\echo '---------------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name IN ('pluggy_item_id', 'pluggy_account_id', 'bank_name', 'account_type') THEN '🔗 Pluggy Integration'
        WHEN column_name IN ('status', 'last_sync_at', 'sync_enabled') THEN '⚡ Sync Status'
        WHEN column_name IN ('last_error', 'error_count') THEN '🚨 Error Tracking'
        ELSE '📋 Standard'
    END as purpose
FROM information_schema.columns 
WHERE table_name = 'bank_connections' 
ORDER BY ordinal_position;

\echo ''
\echo '💳 BANK TRANSACTIONS STRUCTURE'
\echo '-------------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name LIKE 'pix_%' THEN '📱 PIX Specific'
        WHEN column_name LIKE 'sender_%' THEN '👤 Sender Info'
        WHEN column_name IN ('match_status', 'processed_at') THEN '🎯 Matching'
        WHEN column_name IN ('pluggy_transaction_id', 'raw_data') THEN '🔗 Pluggy Data'
        ELSE '📋 Standard'
    END as purpose
FROM information_schema.columns 
WHERE table_name = 'bank_transactions' 
ORDER BY ordinal_position;

\echo ''
\echo '🎯 PAYMENT MATCHES STRUCTURE'
\echo '-----------------------------'
SELECT 
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable",
    CASE 
        WHEN column_name IN ('match_type', 'match_confidence', 'match_reason') THEN '🤖 AI Matching'
        WHEN column_name IN ('matched_amount', 'amount_difference') THEN '💰 Financial'
        WHEN column_name IN ('status', 'confirmed_by', 'confirmed_at') THEN '✅ Confirmation'
        ELSE '📋 Standard'
    END as purpose
FROM information_schema.columns 
WHERE table_name = 'payment_matches' 
ORDER BY ordinal_position;

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
        WHEN column_name IN ('therapy_start_date', 'lv_notas_billing_start_date', 'session_price', 'recurring_pattern', 'notes', 'cpf') THEN '🆕 New'
        ELSE '📋 Original'
    END as status
FROM information_schema.columns 
WHERE table_name = 'patients' 
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
        WHEN table_name = 'unmatched_transactions_with_suggestions' THEN '🏦 Unmatched payments with AI suggestions'
        WHEN table_name = 'therapist_payment_summary' THEN '🏦 Payment overview by therapist'
        ELSE 'Other view'
    END as "Description"
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

\echo ''
\echo '🚀 PERFORMANCE INDEXES'
\echo '-----------------------'
SELECT 
    tablename as "Table",
    indexname as "Index Name",
    CASE 
        WHEN indexname LIKE '%pkey' THEN '🔑 Primary Key'
        WHEN indexname LIKE 'idx_%billing%' THEN '💰 Billing Performance'
        WHEN indexname LIKE 'idx_%bank%' OR indexname LIKE 'idx_%transaction%' OR indexname LIKE 'idx_%payment%' THEN '🏦 Banking Performance'
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
    'Bank Connections' as "Table",
    COUNT(*) as "Records",
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as "Active"
FROM bank_connections
UNION ALL
SELECT 
    'Bank Transactions' as "Table",
    COUNT(*) as "Records",
    SUM(CASE WHEN match_status = 'unmatched' THEN 1 ELSE 0 END) as "Unmatched"
FROM bank_transactions;

\echo ''
\echo '🏦 BANKING INTEGRATION STATUS'
\echo '------------------------------'
-- Check if banking tables exist and show status
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_connections') THEN
        RAISE NOTICE '✅ Banking integration tables are installed';
        PERFORM 1; -- This allows the IF block to execute properly
    ELSE
        RAISE NOTICE '❌ Banking integration tables are missing';
    END IF;
END $$;

-- Show banking summary if tables exist
SELECT 
    bc.bank_name as "Bank",
    COUNT(*) as "Connections",
    COUNT(CASE WHEN bc.status = 'active' THEN 1 END) as "Active",
    COUNT(bt.id) as "Transactions",
    COUNT(CASE WHEN bt.match_status = 'unmatched' THEN 1 END) as "Unmatched"
FROM bank_connections bc
LEFT JOIN bank_transactions bt ON bc.id = bt.bank_connection_id
GROUP BY bc.bank_name
ORDER BY "Connections" DESC;

\echo ''
\echo '💰 BILLING OVERVIEW'
\echo '--------------------'
SELECT * FROM current_billing_settings ORDER BY therapist_name, patient_name LIMIT 10;

\echo ''
\echo '✅ SCHEMA CHECK COMPLETE!'
\echo '========================='
\echo 'If all sections show data, your schema is properly set up for:'
\echo '• Enhanced therapist onboarding with calendar import'
\echo '• Dual date system (historical vs billing start dates)'  
\echo '• Advanced billing cycle management with full history'
\echo '• Smart patient matching and recurring session detection'
\echo '• 🏦 Banking integration with Pluggy for automatic payment tracking'
\echo '• 🤖 AI-powered payment matching with confidence scoring'
\echo '• 📱 PIX payment support with CPF-based patient identification'
\echo '• Complete audit trail for all billing changes'