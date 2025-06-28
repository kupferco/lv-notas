-- clinic-api/db/seed/03_sessions_seed.sql
-- Generate realistic sessions for all patients (simplified approach)

-- Create sessions for premium patients (weekly)
INSERT INTO sessions (date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at)
SELECT 
    s.session_date,
    'event_' || p.id || '_' || EXTRACT(epoch FROM s.session_date)::bigint,
    p.id,
    p.therapist_id,
    CASE 
        WHEN s.session_date < CURRENT_DATE - INTERVAL '3 days' THEN 'compareceu'::session_status
        WHEN s.session_date < CURRENT_DATE THEN 'compareceu'::session_status
        ELSE 'agendada'::session_status
    END,
    p.preco,
    s.session_date - INTERVAL '1 day'
FROM patients p
CROSS JOIN (
    SELECT generate_series(
        '2025-01-06 09:00:00-03'::timestamptz,
        LEAST('2025-07-01 09:00:00-03'::timestamptz, CURRENT_DATE + INTERVAL '2 weeks'),
        '1 week'::interval
    ) as session_date
) s
WHERE p.nome IN ('Maria Silva Santos', 'João Pedro Oliveira', 'Ana Carolina Ferreira')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Create sessions for standard patients (bi-weekly)
INSERT INTO sessions (date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at)
SELECT 
    s.session_date,
    'event_' || p.id || '_' || EXTRACT(epoch FROM s.session_date)::bigint,
    p.id,
    p.therapist_id,
    CASE 
        WHEN s.session_date < CURRENT_DATE - INTERVAL '3 days' THEN 'compareceu'::session_status
        WHEN s.session_date < CURRENT_DATE THEN 'compareceu'::session_status
        ELSE 'agendada'::session_status
    END,
    p.preco,
    s.session_date - INTERVAL '1 day'
FROM patients p
CROSS JOIN (
    SELECT generate_series(
        '2025-01-15 11:00:00-03'::timestamptz,
        LEAST('2025-07-01 11:00:00-03'::timestamptz, CURRENT_DATE + INTERVAL '2 weeks'),
        '2 weeks'::interval
    ) as session_date
) s
WHERE p.nome IN ('Carlos Eduardo Lima', 'Fernanda Costa Rodrigues', 'Rafael Santos Almeida', 'Juliana Pereira Silva', 'Lucas Martins Souza')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Create sessions for monthly patients
INSERT INTO sessions (date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at)
SELECT 
    s.session_date,
    'event_' || p.id || '_' || EXTRACT(epoch FROM s.session_date)::bigint,
    p.id,
    p.therapist_id,
    CASE 
        WHEN s.session_date < CURRENT_DATE - INTERVAL '3 days' THEN 'compareceu'::session_status
        WHEN s.session_date < CURRENT_DATE THEN 'compareceu'::session_status
        ELSE 'agendada'::session_status
    END,
    p.preco,
    s.session_date - INTERVAL '1 day'
FROM patients p
CROSS JOIN (
    SELECT generate_series(
        '2025-02-10 14:30:00-03'::timestamptz,
        LEAST('2025-07-01 14:30:00-03'::timestamptz, CURRENT_DATE + INTERVAL '2 weeks'),
        '4 weeks'::interval
    ) as session_date
) s
WHERE p.nome IN ('Camila Barbosa Santos', 'Gabriel Henrique Costa', 'Bruna Oliveira Lima', 'Thiago Rodrigues Silva')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Create some sessions for recent patients
INSERT INTO sessions (date, google_calendar_event_id, patient_id, therapist_id, status, session_price, created_at)
SELECT 
    s.session_date,
    'event_' || p.id || '_' || EXTRACT(epoch FROM s.session_date)::bigint,
    p.id,
    p.therapist_id,
    CASE 
        WHEN s.session_date < CURRENT_DATE - INTERVAL '3 days' THEN 'compareceu'::session_status
        WHEN s.session_date < CURRENT_DATE THEN 'compareceu'::session_status
        ELSE 'agendada'::session_status
    END,
    p.preco,
    s.session_date - INTERVAL '1 day'
FROM patients p
CROSS JOIN (
    SELECT generate_series(
        '2025-04-05 13:00:00-03'::timestamptz,
        LEAST('2025-07-01 13:00:00-03'::timestamptz, CURRENT_DATE + INTERVAL '2 weeks'),
        '1 week'::interval
    ) as session_date
) s
WHERE p.nome IN ('Diego Santos Lima', 'Natália Ferreira Costa', 'Henrique Oliveira Santos', 'Beatriz Lima Rodrigues', 'Mateus Costa Almeida')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Show sessions summary
SELECT 
    'Sessions created successfully!' as status,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'compareceu') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'agendada') as scheduled_sessions,
    MIN(session_price) as min_price,
    MAX(session_price) as max_price
FROM sessions s
WHERE s.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');