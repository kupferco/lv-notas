#!/bin/bash
# clinic-api/db/cleanup_user_simple.sh
# Simple user cleanup script that actually works

# Colors
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v "#" | xargs)
fi

# Database connection details
DB_HOST=${POSTGRES_HOST:-localhost}
DB_USER=${POSTGRES_USER:-dankupfer}
DB_NAME=${POSTGRES_DB:-clinic_db}

# Get email from parameter or ask user
if [ "$1" != "" ]; then
    TARGET_EMAIL="$1"
else
    echo -e "${YELLOW}Enter the email address to clean up:${NC}"
    read -p "Email: " TARGET_EMAIL
fi

# Validate email format
if [[ ! "$TARGET_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}❌ Invalid email format: $TARGET_EMAIL${NC}"
    exit 1
fi

echo ""
echo -e "${RED}⚠️  WARNING: This will PERMANENTLY DELETE all data for:${NC}"
echo -e "${RED}    📧 $TARGET_EMAIL${NC}"
echo ""
echo -e "${YELLOW}Type 'DELETE' to confirm (case-sensitive):${NC}"
read -p "Confirmation: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE" ]; then
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗑️  Starting cleanup for $TARGET_EMAIL...${NC}"

# Show current data
echo "Current data:"
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
SELECT 
  (SELECT COUNT(*) FROM therapists WHERE email = '$TARGET_EMAIL') as therapists,
  (SELECT COUNT(*) FROM patients WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')) as patients,
  (SELECT COUNT(*) FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')) as sessions,
  (SELECT COUNT(*) FROM check_ins WHERE session_id IN (
    SELECT id FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')
  )) as check_ins,
  (SELECT COUNT(*) FROM calendar_events WHERE email = '$TARGET_EMAIL') as calendar_events;
"

# Delete data step by step
echo "Deleting check-ins..."
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
DELETE FROM check_ins 
WHERE session_id IN (
  SELECT id FROM sessions 
  WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL')
);"

echo "Deleting calendar events..."
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
DELETE FROM calendar_events WHERE email = '$TARGET_EMAIL';"

echo "Deleting sessions..."
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
DELETE FROM sessions 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL');"

echo "Deleting patients..."
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
DELETE FROM patients 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$TARGET_EMAIL');"

echo "Deleting therapist..."
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
DELETE FROM therapists WHERE email = '$TARGET_EMAIL';"

# Show final data
echo "Final data counts:"
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
SELECT 
  (SELECT COUNT(*) FROM therapists) as therapists,
  (SELECT COUNT(*) FROM patients) as patients,
  (SELECT COUNT(*) FROM sessions) as sessions;
"

echo ""
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo -e "${GREEN}📧 All data for $TARGET_EMAIL has been removed${NC}"