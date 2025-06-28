-- clinic-api/db/seed/04_checkins_events_seed.sql
-- Create check-ins and calendar events for completed sessions

-- Create check-ins for all completed sessions
INSERT INTO check_ins (patient_id, session_id, session_date, created_by, status, date)
SELECT 
    s.patient_id,
    s.id,
    s.date,
    'system',
    'compareceu',
    s.date + INTERVAL '5 minutes'
FROM sessions s 
WHERE s.status = 'compareceu'
AND s.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');

-- Create calendar events for recent sessions (last 30 days)
INSERT INTO calendar_events (event_type, google_event_id, session_date, email, date)
SELECT 
    'new',
    s.google_calendar_event_id,
    s.date,
    'dnkupfer@gmail.com',
    s.created_at
FROM sessions s 
WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
AND s.therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')
LIMIT 20;

-- Show final summary
SELECT 
    'Seed data complete!' as status,
    (SELECT COUNT(*) FROM patients WHERE therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')) as patients,
    (SELECT COUNT(*) FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com')) as sessions,
    (SELECT COUNT(*) FROM check_ins WHERE patient_id IN (SELECT id FROM patients WHERE therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'))) as checkins,
    (SELECT COUNT(*) FROM calendar_events WHERE email = 'dnkupfer@gmail.com') as calendar_events;