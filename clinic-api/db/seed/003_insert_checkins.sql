-- Insert check-ins for completed sessions
INSERT INTO check_ins (patient_id, session_id, session_date, created_by, status)
SELECT 
    s.patient_id,
    s.id as session_id,
    s.date as session_date,
    'system' as created_by,
    'compareceu' as status
FROM sessions s
WHERE s.status = 'compareceu';
