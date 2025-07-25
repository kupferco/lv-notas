#!/bin/bash
# clinic-api/db/manage_db.sh
# Simple database management for LV Notas

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v "#" | xargs)
else
    echo -e "${RED}Error: .env file not found in parent directory${NC}"
    exit 1
fi

# Database connection details
DB_HOST=${POSTGRES_HOST:-localhost}
DB_USER=${POSTGRES_USER:-dankupfer}
DB_NAME=${POSTGRES_DB:-clinic_db}

echo -e "${BLUE}🏥 LV Notas Database Manager${NC}"
echo -e "${BLUE}=============================${NC}"
echo

# Function to run SQL files
run_sql() {
    echo -e "${YELLOW}🔄 Running $1...${NC}"
    if psql -h $DB_HOST -U $DB_USER $DB_NAME < $1; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
        echo
    else
        echo -e "${RED}❌ Error running $1${NC}"
        exit 1
    fi
}

# Function to check if database exists
check_db_exists() {
    if psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        return 0
    else
        return 1
    fi
}

# Function to clean up specific user data
cleanup_user() {
    local target_email="$1"
    
    if [ -z "$target_email" ]; then
        echo -e "${YELLOW}Enter the email address to clean up:${NC}"
        read -p "Email: " target_email
    fi
    
    # Validate email format (basic check)
    if [[ ! "$target_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        echo -e "${RED}❌ Invalid email format: $target_email${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${RED}⚠️  WARNING: This will PERMANENTLY DELETE all data for:${NC}"
    echo -e "${RED}    📧 $target_email${NC}"
    echo ""
    echo -e "${RED}This includes:${NC}"
    echo -e "${RED}  • Therapist profile${NC}"
    echo -e "${RED}  • All patients${NC}"
    echo -e "${RED}  • All sessions${NC}"
    echo -e "${RED}  • All check-ins${NC}"
    echo -e "${RED}  • All calendar events${NC}"
    echo -e "${RED}  • All payment data${NC}"
    echo ""
    echo -e "${YELLOW}Type 'DELETE' to confirm (case-sensitive):${NC}"
    read -p "Confirmation: " confirmation
    
    if [ "$confirmation" != "DELETE" ]; then
        echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}🗑️  Starting cleanup for $target_email...${NC}"
    
    # Create temporary SQL file for cleanup
    local temp_sql_file=$(mktemp)
    cat > "$temp_sql_file" << EOF
-- User cleanup script
BEGIN;

-- Show current data counts before deletion
SELECT 
  'Current data counts:' as summary,
  (SELECT COUNT(*) FROM therapists WHERE email = '$target_email') as therapists,
  (SELECT COUNT(*) FROM patients WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')) as patients,
  (SELECT COUNT(*) FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')) as sessions,
  (SELECT COUNT(*) FROM check_ins WHERE session_id IN (
    SELECT id FROM sessions WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')
  )) as check_ins,
  (SELECT COUNT(*) FROM calendar_events WHERE email = '$target_email') as calendar_events;

-- Delete in correct order to respect foreign key constraints

-- 1. Delete check-ins for this therapist's sessions
DELETE FROM check_ins 
WHERE session_id IN (
  SELECT id FROM sessions 
  WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')
);

-- 2. Delete calendar events for this therapist
DELETE FROM calendar_events WHERE email = '$target_email';

-- 3. Delete calendar webhooks for this therapist
DELETE FROM calendar_webhooks 
WHERE channel_id IN (
  SELECT CONCAT('lv-calendar-webhook-', id) FROM therapists WHERE email = '$target_email'
);

-- 4. Delete sessions for this therapist
DELETE FROM sessions 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 5. Delete patients for this therapist
DELETE FROM patients 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 6. Delete the therapist record
DELETE FROM therapists WHERE email = '$target_email';

-- Show final counts
SELECT 
  'Cleanup completed!' as summary,
  (SELECT COUNT(*) FROM therapists) as remaining_therapists,
  (SELECT COUNT(*) FROM patients) as remaining_patients,
  (SELECT COUNT(*) FROM sessions) as remaining_sessions;

COMMIT;
EOF
    
    # Execute the cleanup
    if psql -h $DB_HOST -U $DB_USER $DB_NAME -f "$temp_sql_file"; then
        echo ""
        echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
        echo -e "${GREEN}📧 All data for $target_email has been removed${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "${YELLOW}  1. Clear browser localStorage/cookies${NC}"
        echo -e "${YELLOW}  2. Test fresh onboarding process${NC}"
        echo -e "${YELLOW}  3. Optionally run: $0 check${NC}"
        echo ""
        echo -e "${GREEN}🎉 Ready for fresh testing!${NC}"
    else
        echo -e "${RED}❌ Cleanup failed. Check the error messages above.${NC}"
        exit 1
    fi
    
    # Clean up temp file
    rm "$temp_sql_file"
}

case "$1" in
    "fresh")
        echo -e "${YELLOW}🗑️  Creating fresh database (WARNING: This will delete all existing data!)${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            echo -e "${YELLOW}Dropping and recreating database...${NC}"
            psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            echo -e "${GREEN}🎉 Fresh database created with complete schema!${NC}"
        else
            echo -e "${RED}❌ Operation cancelled${NC}"
        fi
        ;;
    "schema")
        echo -e "${YELLOW}📋 Installing complete schema...${NC}"
        if ! check_db_exists; then
            echo -e "${YELLOW}Database doesn't exist, creating it...${NC}"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        fi
        run_sql "complete_schema.sql"
        echo -e "${GREEN}🎉 Schema installation complete!${NC}"
        ;;
    "seed")
        echo -e "${YELLOW}🌱 Adding basic test data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        run_sql "seed/basic_seed_data.sql"
        echo -e "${GREEN}🎉 Basic test data added successfully!${NC}"
        ;;
    "comprehensive")
        echo -e "${YELLOW}🚀 Adding comprehensive payment test data (20 patients, 6 months sessions)...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        echo -e "${BLUE}Loading comprehensive seed data in 4 parts...${NC}"
        run_sql "seed/01_therapist_seed.sql"
        run_sql "seed/02_patients_seed.sql"
        run_sql "seed/03_sessions_seed.sql"
        run_sql "seed/04_checkins_events_seed.sql"
        echo -e "${GREEN}🎉 Comprehensive payment test data loaded successfully!${NC}"
        echo -e "${BLUE}✅ 20 patients with diverse pricing (R$ 120-250)${NC}"
        echo -e "${BLUE}✅ ~200-300 sessions spanning 6 months${NC}"
        echo -e "${BLUE}✅ Realistic payment scenarios for testing${NC}"
        ;;
    "fresh-comprehensive")
        echo -e "${YELLOW}🗑️  Creating fresh database with comprehensive data (WARNING: This will delete all existing data!)${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            echo -e "${YELLOW}Dropping and recreating database...${NC}"
            psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            echo -e "${BLUE}Loading comprehensive seed data...${NC}"
            run_sql "seed/01_therapist_seed.sql"
            run_sql "seed/02_patients_seed.sql"
            run_sql "seed/03_sessions_seed.sql"
            run_sql "seed/04_checkins_events_seed.sql"
            run_sql "seed/05_payment_test_data.sql"
            echo -e "${GREEN}🎉 Fresh database with comprehensive payment data created!${NC}"
        else
            echo -e "${RED}❌ Operation cancelled${NC}"
        fi
        ;;
    "check")
        echo -e "${YELLOW}🔍 Checking database schema and data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        psql -h $DB_HOST -U $DB_USER $DB_NAME < check_schema.sql
        ;;
    "reset")
        echo -e "${YELLOW}🔄 Resetting with fresh schema and basic test data...${NC}"
        read -p "This will delete all data and recreate everything. Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            run_sql "seed/basic_seed_data.sql"
            echo -e "${GREEN}🎉 Database reset complete with basic test data!${NC}"
        else
            echo -e "${RED}❌ Operation cancelled${NC}"
        fi
        ;;
    "reset-comprehensive")
        echo -e "${YELLOW}🔄 Resetting with fresh schema and comprehensive payment data...${NC}"
        read -p "This will delete all data and recreate everything. Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            echo -e "${BLUE}Loading comprehensive seed data...${NC}"
            run_sql "seed/01_therapist_seed.sql"
            run_sql "seed/02_patients_seed.sql"
            run_sql "seed/03_sessions_seed.sql"
            run_sql "seed/04_checkins_events_seed.sql"
            echo -e "${GREEN}🎉 Database reset complete with comprehensive payment data!${NC}"
        else
            echo -e "${RED}❌ Operation cancelled${NC}"
        fi
        ;;
    "cleanup-user")
        echo -e "${YELLOW}🧹 Cleaning up specific user data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        cleanup_user "$2"
        ;;
    "backup")
        echo -e "${YELLOW}💾 Creating database backup...${NC}"
        backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $backup_file
        echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
        ;;
    "migrate-auth")
        echo -e "${YELLOW}🔐 Migrating to new authentication system (PRODUCTION SAFE)${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        echo -e "${BLUE}This migration is SAFE for production - no existing data will be deleted${NC}"
        read -p "Continue with authentication migration? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            run_sql "migrate_to_auth_system.sql"
            echo -e "${GREEN}🎉 Authentication system migration completed!${NC}"
            echo -e "${YELLOW}⚠️  IMPORTANT: All users need to reset their passwords using 'Forgot Password'${NC}"
        else
            echo -e "${RED}❌ Migration cancelled${NC}"
        fi
        ;;
    *)
        echo -e "${BLUE}Usage: $0 [command]${NC}"
        echo
        echo -e "${YELLOW}Available commands:${NC}"
        echo -e "  ${GREEN}fresh${NC}                - 🗑️  Create completely fresh database (deletes all data)"
        echo -e "  ${GREEN}fresh-comprehensive${NC}  - 🚀 Fresh database + comprehensive payment data"
        echo -e "  ${GREEN}schema${NC}               - 📋 Install/update schema only"
        echo -e "  ${GREEN}seed${NC}                 - 🌱 Add basic test data to existing database"
        echo -e "  ${GREEN}comprehensive${NC}        - 🚀 Add comprehensive payment test data (20 patients)"
        echo -e "  ${GREEN}check${NC}                - 🔍 Verify schema and show data summary"
        echo -e "  ${GREEN}reset${NC}                - 🔄 Fresh database + schema + basic test data"
        echo -e "  ${GREEN}reset-comprehensive${NC}  - 🔄 Fresh database + schema + comprehensive data"
        echo -e "  ${GREEN}cleanup-user [email]${NC}  - 🧹 Remove all data for specific user/therapist"
        echo -e "  ${GREEN}backup${NC}               - 💾 Create database backup"
        echo -e "  ${GREEN}migrate-auth${NC}         - 🔐 Migrate to new authentication system (PRODUCTION SAFE)"
        echo
        echo -e "${YELLOW}Examples for User Management:${NC}"
        echo -e "  $0 cleanup-user your-email@example.com  # Clean specific user"
        echo -e "  $0 cleanup-user                         # Clean user (will prompt for email)"
        echo
        echo -e "${YELLOW}Examples for Payment Testing:${NC}"
        echo -e "  $0 fresh-comprehensive  # Complete fresh start with payment test data"
        echo -e "  $0 comprehensive        # Add payment test data to existing DB"
        echo -e "  $0 reset-comprehensive  # Reset everything with comprehensive data"
        echo
        echo -e "${YELLOW}Basic Examples:${NC}"
        echo -e "  $0 fresh    # Basic fresh start (development)"
        echo -e "  $0 schema   # Update schema only (production)"
        echo -e "  $0 seed     # Add basic test data (development)"
        echo -e "  $0 check    # Verify everything is working"
        echo
        echo -e "${YELLOW}Database Info:${NC}"
        echo -e "  Host: $DB_HOST"
        echo -e "  User: $DB_USER"
        echo -e "  Database: $DB_NAME"
        ;;
esac