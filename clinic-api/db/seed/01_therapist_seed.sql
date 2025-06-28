-- clinic-api/db/seed/01_therapist_seed.sql
-- Setup therapist for dnkupfer@gmail.com

INSERT INTO therapists (nome, email, telefone, google_calendar_id, billing_cycle, default_session_price, onboarding_completed, created_at) 
VALUES (
    'Dr. Daniel Kupfer',
    'dnkupfer@gmail.com',
    '+447866750132',
    'c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com',
    'monthly',
    180.00,
    true,
    '2024-12-01 08:00:00-03'
);

-- Verify therapist was created
SELECT 
    'Therapist setup complete!' as status,
    id,
    nome,
    email
FROM therapists 
WHERE email = 'dnkupfer@gmail.com';