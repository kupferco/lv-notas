-- clinic-api/db/seed/05_payment_test_data.sql
-- Add realistic payment scenarios for testing

-- Create some payment requests for certain patients
INSERT INTO payment_requests (patient_id, therapist_id, session_ids, total_amount, request_type, whatsapp_sent, request_date) 
SELECT 
    p.id,
    p.therapist_id,
    ARRAY(SELECT s.id FROM sessions s WHERE s.patient_id = p.id AND s.status = 'compareceu' LIMIT 3),
    (SELECT SUM(s.session_price) FROM sessions s WHERE s.patient_id = p.id AND s.status = 'compareceu' LIMIT 3),
    'invoice',
    true,
    CURRENT_DATE - INTERVAL '3 days'
FROM patients p 
WHERE p.nome IN ('Maria Silva Santos', 'João Pedro Oliveira', 'Carlos Eduardo Lima')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Create some payment requests that are overdue (older than 7 days)
INSERT INTO payment_requests (patient_id, therapist_id, session_ids, total_amount, request_type, whatsapp_sent, request_date) 
SELECT 
    p.id,
    p.therapist_id,
    ARRAY(SELECT s.id FROM sessions s WHERE s.patient_id = p.id AND s.status = 'compareceu' LIMIT 2),
    (SELECT SUM(s.session_price) FROM sessions s WHERE s.patient_id = p.id AND s.status = 'compareceu' LIMIT 2),
    'invoice',
    true,
    CURRENT_DATE - INTERVAL '12 days'
FROM patients p 
WHERE p.nome IN ('Ana Carolina Ferreira', 'Fernanda Costa Rodrigues')
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Update sessions to reflect payment requests (recent ones - "Aguardando Pagamento")
UPDATE sessions 
SET 
    payment_requested = true,
    payment_request_date = CURRENT_DATE - INTERVAL '3 days',
    payment_status = 'pending'
WHERE patient_id IN (
    SELECT p.id FROM patients p 
    WHERE p.nome IN ('Maria Silva Santos', 'João Pedro Oliveira', 'Carlos Eduardo Lima')
    AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
)
AND status = 'compareceu'
AND id IN (
    SELECT s.id FROM sessions s 
    JOIN patients p ON s.patient_id = p.id
    WHERE p.nome IN ('Maria Silva Santos', 'João Pedro Oliveira', 'Carlos Eduardo Lima')
    AND s.status = 'compareceu'
    ORDER BY s.date DESC
    LIMIT 9 -- 3 sessions each for 3 patients
);

-- Update sessions to reflect overdue payment requests (older than 7 days - "Pendente")
UPDATE sessions 
SET 
    payment_requested = true,
    payment_request_date = CURRENT_DATE - INTERVAL '12 days',
    payment_status = 'pending'
WHERE patient_id IN (
    SELECT p.id FROM patients p 
    WHERE p.nome IN ('Ana Carolina Ferreira', 'Fernanda Costa Rodrigues')
    AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
)
AND status = 'compareceu'
AND id IN (
    SELECT s.id FROM sessions s 
    JOIN patients p ON s.patient_id = p.id
    WHERE p.nome IN ('Ana Carolina Ferreira', 'Fernanda Costa Rodrigues')
    AND s.status = 'compareceu'
    ORDER BY s.date DESC
    LIMIT 6 -- 3 sessions each for 2 patients
);

-- Create some actual payments (mark some sessions as paid)
INSERT INTO payment_transactions (session_id, patient_id, therapist_id, amount, payment_method, payment_date, reference_number, created_by)
SELECT 
    s.id,
    s.patient_id,
    s.therapist_id,
    s.session_price,
    'pix',
    CURRENT_DATE - INTERVAL '1 day',
    'PIX' || LPAD((RANDOM() * 999999)::INT::TEXT, 6, '0'),
    'system'
FROM sessions s
JOIN patients p ON s.patient_id = p.id
WHERE p.nome IN ('Rafael Santos Almeida', 'Juliana Pereira Silva', 'Lucas Martins Souza')
AND s.status = 'compareceu'
AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
ORDER BY s.date DESC
LIMIT 12; -- 4 sessions each for 3 patients

-- Update those sessions to reflect they are paid
UPDATE sessions 
SET 
    payment_status = 'paid',
    paid_date = CURRENT_DATE - INTERVAL '1 day'
WHERE id IN (
    SELECT s.id FROM sessions s
    JOIN patients p ON s.patient_id = p.id
    WHERE p.nome IN ('Rafael Santos Almeida', 'Juliana Pereira Silva', 'Lucas Martins Souza')
    AND s.status = 'compareceu'
    AND p.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
    ORDER BY s.date DESC
    LIMIT 12
);

-- Show summary of what we created
SELECT 
    'Payment test data created!' as status,
    (SELECT COUNT(*) FROM payment_requests) as payment_requests_created,
    (SELECT COUNT(*) FROM payment_transactions) as payments_recorded,
    (SELECT COUNT(*) FROM sessions WHERE payment_status = 'paid') as paid_sessions,
    (SELECT COUNT(*) FROM sessions WHERE payment_requested = true AND payment_request_date > CURRENT_DATE - INTERVAL '7 days') as awaiting_payment,
    (SELECT COUNT(*) FROM sessions WHERE payment_requested = true AND payment_request_date <= CURRENT_DATE - INTERVAL '7 days') as overdue_sessions,
    (SELECT COUNT(*) FROM sessions WHERE payment_requested = false AND payment_status = 'pending') as not_yet_requested;