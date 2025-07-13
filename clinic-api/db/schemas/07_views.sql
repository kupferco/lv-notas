-- clinic-api/db/schemas/07_views.sql
-- Database views for easy data access

-- =============================================================================
-- DROP EXISTING VIEWS
-- =============================================================================

DROP VIEW IF EXISTS payment_overview CASCADE;
DROP VIEW IF EXISTS billing_change_history CASCADE;
DROP VIEW IF EXISTS current_billing_settings CASCADE;
DROP VIEW IF EXISTS therapist_onboarding_progress CASCADE;
DROP VIEW IF EXISTS billable_sessions CASCADE;

-- =============================================================================
-- CORE VIEWS
-- =============================================================================

-- View for billable sessions (sessions after LV Notas billing start date)
CREATE VIEW billable_sessions AS
SELECT 
    s.*,
    p.lv_notas_billing_start_date,
    CASE 
        WHEN s.date::date >= p.lv_notas_billing_start_date THEN true 
        ELSE false 
    END as counts_for_billing
FROM sessions s
JOIN patients p ON s.patient_id = p.id
WHERE s.billable = true;

-- View for onboarding progress
CREATE VIEW therapist_onboarding_progress AS
SELECT 
    t.id as therapist_id,
    t.email,
    t.onboarding_completed,
    t.onboarding_started_at,
    t.onboarding_completed_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'step', tog.step,
                'completed_at', tog.completed_at,
                'data', tog.data,
                'notes', tog.notes
            ) ORDER BY tog.completed_at
        ) FILTER (WHERE tog.step IS NOT NULL), 
        '[]'::json
    ) as completed_steps,
    CASE 
        WHEN t.onboarding_completed THEN 'completed'
        WHEN COUNT(tog.step) = 0 THEN 'not_started'
        ELSE 'in_progress'
    END as status
FROM therapists t
LEFT JOIN therapist_onboarding tog ON t.id = tog.therapist_id
GROUP BY t.id, t.email, t.onboarding_completed, t.onboarding_started_at, t.onboarding_completed_at;

-- View for current billing settings
CREATE VIEW current_billing_settings AS
SELECT 
    p.id as patient_id,
    p.nome as patient_name,
    p.therapist_id,
    t.nome as therapist_name,
    t.email as therapist_email,
    t.billing_cycle as current_billing_cycle,
    COALESCE(p.session_price, t.default_session_price) as current_session_price,
    CASE WHEN p.session_price IS NOT NULL THEN true ELSE false END as has_patient_override,
    p.lv_notas_billing_start_date,
    -- Count billable sessions for current billing period
    (SELECT COUNT(*) 
     FROM sessions s 
     WHERE s.patient_id = p.id 
        AND s.billable = true 
        AND s.status = 'compareceu'
        AND p.lv_notas_billing_start_date IS NOT NULL
        AND s.date::date >= p.lv_notas_billing_start_date
    ) as total_billable_sessions
FROM patients p
JOIN therapists t ON p.therapist_id = t.id;

-- View for billing change history
CREATE VIEW billing_change_history AS
SELECT 
    'therapist' as change_type,
    tbh.id as history_id,
    tbh.therapist_id,
    NULL::integer as patient_id,
    t.nome as therapist_name,
    NULL as patient_name,
    tbh.billing_cycle,
    tbh.default_session_price as price,
    tbh.effective_from_date,
    tbh.effective_until_date,
    tbh.reason_for_change,
    tbh.created_by,
    tbh.created_at,
    tbh.notes
FROM therapist_billing_history tbh
JOIN therapists t ON tbh.therapist_id = t.id

UNION ALL

SELECT 
    'patient' as change_type,
    pbh.id as history_id,
    pbh.therapist_id,
    pbh.patient_id,
    t.nome as therapist_name,
    p.nome as patient_name,
    pbh.billing_cycle,
    pbh.session_price as price,
    pbh.effective_from_date,
    pbh.effective_until_date,
    pbh.reason_for_change,
    pbh.created_by,
    pbh.created_at,
    pbh.notes
FROM patient_billing_history pbh
JOIN therapists t ON pbh.therapist_id = t.id
JOIN patients p ON pbh.patient_id = p.id

ORDER BY created_at DESC;

-- Payment overview view - complete payment status for all sessions
CREATE VIEW payment_overview AS
SELECT 
    s.id as session_id,
    s.date as session_date,
    s.session_price,
    s.payment_status,
    s.payment_requested,
    s.payment_request_date,
    s.paid_date,
    p.id as patient_id,
    p.nome as patient_name,
    p.telefone as patient_phone,
    t.id as therapist_id,
    t.nome as therapist_name,
    t.email as therapist_email,
    pt.id as payment_transaction_id,
    pt.amount as paid_amount,
    pt.payment_method,
    pt.payment_date,
    pt.reference_number,
    -- Calculate days since session
    (CURRENT_DATE - s.date::date)::integer as days_since_session,
    -- Calculate days since payment requested
    CASE 
        WHEN s.payment_request_date IS NOT NULL 
        THEN (CURRENT_DATE - s.payment_request_date::date)::integer
        ELSE NULL 
    END as days_since_request,
    -- Determine current payment state
    CASE 
        WHEN s.payment_status = 'paid' THEN 'pago'
        WHEN s.payment_requested = false THEN 'nao_cobrado'
        WHEN s.payment_requested = true AND s.payment_request_date > CURRENT_DATE - INTERVAL '7 days' THEN 'aguardando_pagamento'
        WHEN s.payment_requested = true AND s.payment_request_date <= CURRENT_DATE - INTERVAL '7 days' THEN 'pendente'
        ELSE 'nao_cobrado'
    END as payment_state
FROM sessions s
JOIN patients p ON s.patient_id = p.id
JOIN therapists t ON s.therapist_id = t.id
LEFT JOIN payment_transactions pt ON s.id = pt.session_id
WHERE s.status = 'compareceu'
  AND s.date::date >= p.lv_notas_billing_start_date;

-- =============================================================================
-- COMMENTS FOR VIEWS
-- =============================================================================

COMMENT ON VIEW billable_sessions IS 'Sessions that count for billing based on LV Notas billing start date';
COMMENT ON VIEW therapist_onboarding_progress IS 'Complete onboarding status and progress for each therapist';
COMMENT ON VIEW current_billing_settings IS 'Current billing configuration for all patients with session counts';
COMMENT ON VIEW billing_change_history IS 'Complete history of all billing changes for therapists and patients';
COMMENT ON VIEW payment_overview IS 'Complete payment status overview with calculated payment states';