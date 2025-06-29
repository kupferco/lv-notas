#!/bin/bash
# clinic-api/db/scripts/user-cleanup_start.sh
# Convenient script to clean up a specific user's data

set -e

# Database connection variables
DB_USER="${POSTGRES_USER:-dankupfer}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_NAME="${POSTGRES_DB:-clinic_db}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== LV Notas User Data Cleanup Tool ===${NC}"
echo ""

# Get email from parameter or ask user
if [ "$1" != "" ]; then
    TARGET_EMAIL="$1"
else
    echo -e "${YELLOW}Enter the email address to clean up:${NC}"
    read -p "Email: " TARGET_EMAIL
fi

# Validate email format (basic check)
if [[ ! "$TARGET_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}❌ Invalid email format: $TARGET_EMAIL${NC}"
    exit 1
fi

echo ""
echo -e "${RED}⚠️  WARNING: This will PERMANENTLY DELETE all data for:${NC}"
echo -e "${RED}    📧 $TARGET_EMAIL${NC}"
echo ""
echo -e "${RED}This includes:${NC}"
echo -e "${RED}  • Therapist profile${NC}"
echo -e "${RED}  • All patients${NC}"
echo -e "${RED}  • All sessions${NC}"
echo -e "${RED}  • All check-ins${NC}"
echo -e "${RED}  • All calendar events${NC}"
echo ""
echo -e "${YELLOW}Type 'DELETE' to confirm (case-sensitive):${NC}"
read -p "Confirmation: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE" ]; then
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  Starting cleanup for $TARGET_EMAIL...${NC}"

# Create temporary SQL file with the target email
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << EOF
-- Generated cleanup script for $TARGET_EMAIL
\set target_email '$TARGET_EMAIL'

BEGIN;

-- Display what we're about to delete
SELECT 'Cleaning up data for therapist: ' || :'target_email' as message;

-- Get the therapist ID first
DO \$\$
DECLARE
    therapist_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO therapist_count FROM therapists WHERE email = '$TARGET_EMAIL';
    IF therapist_count = 0 THEN
        RAISE NOTICE 'No therapist found with email: $TARGET_EMAIL';
    ELSE
        RAISE NOTICE 'Found therapist with email: $TARGET_EMAIL';
    END IF;
END
\$\$;

-- Show current data counts before deletion
SELECT 
  'Current data for $TARGET_EMAIL:' as summary,
  (SELECT COUNT(*) FROM therapists WHERE email = '$TARGET_EMAIL') as therapists,
  (SELECT COUNT(*) FROM patients WHERE id IN (
    SELECT DISTINCT patient_id FROM sessions 
    WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')
  )) as patients,
  (SELECT COUNT(*) FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')) as sessions,
  (SELECT COUNT(*) FROM check_ins WHERE session_id IN (
    SELECT id FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')
  )) as check_ins,
  (SELECT COUNT(*) FROM calendar_events WHERE email = '$TARGET_EMAIL') as calendar_events;

-- Delete in correct order to respect foreign key constraints

-- 1. Delete check-ins for this therapist's sessions
DELETE FROM check_ins 
WHERE session_id IN (
  SELECT id FROM sessions 
  WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')
);

-- 2. Delete calendar events for this therapist
DELETE FROM calendar_events WHERE email = '$TARGET_EMAIL';

-- 3. Delete sessions for this therapist
DELETE FROM sessions 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL');

-- 4. Delete patients that belong to this therapist
DELETE FROM patients 
WHERE id IN (
  SELECT DISTINCT p.id FROM patients p
  INNER JOIN sessions s ON p.id = s.patient_id
  INNER JOIN therapists t ON s.therapist_id = t.id
  WHERE t.email = '$TARGET_EMAIL'
);

-- 5. Delete the therapist record
DELETE FROM therapists WHERE email = '$TARGET_EMAIL';

-- Show final counts
SELECT 
  'Cleanup completed!' as summary,
  (SELECT COUNT(*) FROM therapists) as remaining_therapists,
  (SELECT COUNT(*) FROM patients) as remaining_patients,
  (SELECT COUNT(*) FROM sessions) as remaining_sessions;

COMMIT;
EOF

# Execute the cleanup
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$TEMP_SQL"; then
    echo ""
    echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
    echo -e "${GREEN}📧 All data for $TARGET_EMAIL has been removed${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${YELLOW}  1. Clear browser localStorage/cookies${NC}"
    echo -e "${YELLOW}  2. Test fresh onboarding process${NC}"
else
    echo -e "${RED}❌ Cleanup failed. Check the error messages above.${NC}"
    exit 1
fi

# Clean up temp file
rm "$TEMP_SQL"

echo ""
echo -e "${GREEN}🎉 Ready for fresh testing!${NC}"