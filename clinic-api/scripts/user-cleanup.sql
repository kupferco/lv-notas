-- clinic-api/db/scripts/user-cleanup.sql
-- Script to completely wipe all data for a specific user/therapist
-- This allows clean testing from scratch

-- Replace 'dnkupfer@gmail.com' with the email you want to clean
-- Usage: psql -h localhost -U your_user clinic_db -f user-cleanup.sql

-- Set the target email (change this as needed)
\set target_email 'dnkupfer@gmail.com'

BEGIN;

-- Display what we're about to delete
SELECT 'Cleaning up data for therapist: ' || :'target_email' as message;

-- Get the therapist ID first
SELECT 'Therapist ID: ' || id::text as therapist_info FROM therapists WHERE email = :'target_email';

-- Show current data counts before deletion
SELECT 
  'Current data for ' || :'target_email' || ':' as summary,
  (SELECT COUNT(*) FROM therapists WHERE email = :'target_email') as therapists,
  (SELECT COUNT(*) FROM patients WHERE id IN (
    SELECT DISTINCT patient_id FROM sessions 
    WHERE therapist_id = (SELECT id FROM therapists WHERE email = :'target_email')
  )) as patients,
  (SELECT COUNT(*) FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = :'target_email')) as sessions,
  (SELECT COUNT(*) FROM check_ins WHERE session_id IN (
    SELECT id FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = :'target_email')
  )) as check_ins,
  (SELECT COUNT(*) FROM calendar_events WHERE email = :'target_email') as calendar_events,
  (SELECT COUNT(*) FROM calendar_webhooks) as webhooks;

-- Delete in correct order to respect foreign key constraints

-- 1. Delete check-ins for this therapist's sessions
DELETE FROM check_ins 
WHERE session_id IN (
  SELECT id FROM sessions 
  WHERE therapist_id = (SELECT id FROM therapists WHERE email = :'target_email')
);

-- 2. Delete calendar events for this therapist
DELETE FROM calendar_events WHERE email = :'target_email';

-- 3. Delete sessions for this therapist
DELETE FROM sessions 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = :'target_email');

-- 4. Delete patients that only belong to this therapist
-- (We'll delete all patients for now since we're testing with single therapist)
DELETE FROM patients 
WHERE id IN (
  SELECT DISTINCT p.id FROM patients p
  LEFT JOIN sessions s ON p.id = s.patient_id
  LEFT JOIN therapists t ON s.therapist_id = t.id
  WHERE t.email = :'target_email' OR t.email IS NULL
);

-- 5. Delete the therapist record
DELETE FROM therapists WHERE email = :'target_email';

-- 6. Clean up orphaned calendar webhooks (optional - affects all users)
-- DELETE FROM calendar_webhooks WHERE expiration < NOW();

-- Show final counts
SELECT 
  'Data remaining after cleanup:' as summary,
  (SELECT COUNT(*) FROM therapists) as total_therapists,
  (SELECT COUNT(*) FROM patients) as total_patients,
  (SELECT COUNT(*) FROM sessions) as total_sessions,
  (SELECT COUNT(*) FROM check_ins) as total_check_ins,
  (SELECT COUNT(*) FROM calendar_events) as total_calendar_events;

SELECT 'Cleanup completed for: ' || :'target_email' as result;

COMMIT;