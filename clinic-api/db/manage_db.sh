#!/bin/bash
# clinic-api/db/manage_db.sh
# Enhanced database management for LV Notas with production safety

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
PURPLE="\033[0;35m"
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

# Enhanced backup function with compression and rotation
create_backup() {
    local backup_type="$1"
    local description="$2"
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    # Generate backup filename with timestamp
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backups/${backup_type}_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    echo -e "${YELLOW}💾 Creating ${backup_type} backup...${NC}"
    echo -e "${BLUE}Description: ${description}${NC}"
    
    # Create the backup
    if pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $backup_file; then
        # Compress the backup
        gzip $backup_file
        
        # Get file size
        local file_size=$(du -h $compressed_file | cut -f1)
        
        echo -e "${GREEN}✅ Backup created successfully!${NC}"
        echo -e "${GREEN}📁 File: $compressed_file${NC}"
        echo -e "${GREEN}📏 Size: $file_size${NC}"
        
        # Count existing backups and show cleanup info
        local backup_count=$(ls -1 backups/${backup_type}_*.sql.gz 2>/dev/null | wc -l)
        echo -e "${BLUE}📊 Total ${backup_type} backups: $backup_count${NC}"
        
        if [ $backup_count -gt 10 ]; then
            echo -e "${YELLOW}⚠️  You have more than 10 ${backup_type} backups. Consider cleanup.${NC}"
            echo -e "${YELLOW}💡 Run: $0 cleanup-backups${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        return 1
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo -e "${BLUE}📋 Available backups:${NC}"
        ls -la backups/*.sql.gz 2>/dev/null | while read -r line; do
            echo -e "${YELLOW}  $line${NC}"
        done
        echo
        echo -e "${YELLOW}Enter backup filename to restore:${NC}"
        read -p "Backup file: " backup_file
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${RED}⚠️  WARNING: This will COMPLETELY REPLACE the current database!${NC}"
    echo -e "${RED}📧 Database: $DB_NAME${NC}"
    echo -e "${RED}📁 Backup: $backup_file${NC}"
    echo ""
    echo -e "${YELLOW}Type 'RESTORE' to confirm (case-sensitive):${NC}"
    read -p "Confirmation: " confirmation
    
    if [ "$confirmation" != "RESTORE" ]; then
        echo -e "${YELLOW}❌ Restore cancelled${NC}"
        return 1
    fi
    
    # Create pre-restore backup
    create_backup "pre_restore" "Automatic backup before restore operation"
    
    echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"
    
    # Drop and recreate database
    psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    
    # Restore from backup
    if gunzip -c $backup_file | psql -h $DB_HOST -U $DB_USER $DB_NAME; then
        echo -e "${GREEN}✅ Database restored successfully!${NC}"
    else
        echo -e "${RED}❌ Restore failed!${NC}"
        exit 1
    fi
}

# Function to add NFS-e support safely (PRODUCTION SAFE)
add_nfse_support() {
    echo -e "${PURPLE}🧾 Adding NFS-e Support to Existing Database${NC}"
    echo -e "${PURPLE}=============================================${NC}"
    echo ""
    
    if ! check_db_exists; then
        echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
        exit 1
    fi
    
    # Check if NFS-e tables already exist
    local nfse_exists=$(psql -h $DB_HOST -U $DB_USER $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'therapist_nfse_config');")
    
    if [ "$nfse_exists" = "t" ]; then
        echo -e "${YELLOW}⚠️  NFS-e tables already exist!${NC}"
        echo -e "${BLUE}📋 Checking NFS-e configuration...${NC}"
        psql -h $DB_HOST -U $DB_USER $DB_NAME -c "SELECT COUNT(*) as nfse_configs FROM therapist_nfse_config;"
        psql -h $DB_HOST -U $DB_USER $DB_NAME -c "SELECT COUNT(*) as nfse_invoices FROM nfse_invoices;"
        return 0
    fi
    
    echo -e "${BLUE}This will safely add NFS-e support to your existing database:${NC}"
    echo -e "${GREEN}✅ SAFE: No existing data will be modified or deleted${NC}"
    echo -e "${GREEN}✅ SAFE: Only adds new tables and configuration${NC}"
    echo -e "${GREEN}✅ SAFE: Automatic backup created before changes${NC}"
    echo -e "${GREEN}✅ SAFE: Can be rolled back if needed${NC}"
    echo ""
    echo -e "${BLUE}What will be added:${NC}"
    echo -e "  • therapist_nfse_config table (NFS-e settings per therapist)"
    echo -e "  • nfse_invoices table (invoice tracking)"
    echo -e "  • NFS-e configuration settings"
    echo -e "  • Provider-agnostic support (PlugNotas, Focus NFe, NFe.io)"
    echo ""
    
    read -p "Continue with NFS-e installation? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}❌ Operation cancelled${NC}"
        return 1
    fi
    
    # Create automatic backup before changes
    create_backup "pre_nfse" "Automatic backup before adding NFS-e support"
    
    echo -e "${YELLOW}🧾 Adding NFS-e integration tables...${NC}"
    
    # Check if the NFS-e schema file exists
    if [ ! -f "schemas/13_nfse_integration.sql" ]; then
        echo -e "${RED}❌ NFS-e schema file not found: schemas/13_nfse_integration.sql${NC}"
        echo -e "${YELLOW}💡 Please create the file first using the provided artifact${NC}"
        exit 1
    fi
    
    # Run the NFS-e schema
    run_sql "schemas/13_nfse_integration.sql"
    
    echo -e "${GREEN}🎉 NFS-e support added successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 NFS-e Status Summary:${NC}"
    psql -h $DB_HOST -U $DB_USER $DB_NAME -c "
        SELECT 
            'NFS-e Integration Status' as summary,
            (SELECT COUNT(*) FROM therapist_nfse_config) as nfse_configs,
            (SELECT COUNT(*) FROM nfse_invoices) as nfse_invoices,
            (SELECT COUNT(*) FROM app_configuration WHERE key LIKE 'nfse_%') as nfse_settings;
    "
    
    echo -e "${YELLOW}🎯 Next Steps:${NC}"
    echo -e "1. Set up PlugNotas account and get API credentials"
    echo -e "2. Update backend to support NFS-e endpoints"
    echo -e "3. Add NFS-e configuration to Settings UI"
    echo -e "4. Test certificate upload and invoice generation"
    echo ""
    echo -e "${GREEN}✅ Your existing data is completely safe!${NC}"
}

# Function to cleanup old backups
cleanup_backups() {
    echo -e "${YELLOW}🧹 Backup Cleanup${NC}"
    echo -e "${YELLOW}=================${NC}"
    echo ""
    
    if [ ! -d "backups" ]; then
        echo -e "${BLUE}📁 No backups directory found${NC}"
        return 0
    fi
    
    local total_backups=$(ls -1 backups/*.sql.gz 2>/dev/null | wc -l)
    
    if [ $total_backups -eq 0 ]; then
        echo -e "${BLUE}📁 No backups found${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📊 Found $total_backups backup files${NC}"
    echo ""
    echo -e "${BLUE}📋 Backup breakdown:${NC}"
    
    # Show backup types and counts
    for backup_type in manual auto pre_restore pre_nfse fresh comprehensive; do
        local count=$(ls -1 backups/${backup_type}_*.sql.gz 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            echo -e "  ${backup_type}: $count files"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}Cleanup options:${NC}"
    echo -e "1. Keep last 5 of each type (recommended)"
    echo -e "2. Keep last 10 of each type"
    echo -e "3. Keep only last 3 of each type (aggressive)"
    echo -e "4. List all backups (no cleanup)"
    echo -e "5. Cancel"
    echo ""
    read -p "Choose option [1-5]: " cleanup_option
    
    case $cleanup_option in
        1) keep_count=5 ;;
        2) keep_count=10 ;;
        3) keep_count=3 ;;
        4) 
            echo -e "${BLUE}📋 All backups:${NC}"
            ls -la backups/*.sql.gz 2>/dev/null
            return 0
            ;;
        5) 
            echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
            return 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            return 1
            ;;
    esac
    
    echo -e "${YELLOW}🗑️  Cleaning up backups (keeping last $keep_count of each type)...${NC}"
    
    # Cleanup each backup type
    for backup_type in manual auto pre_restore pre_nfse fresh comprehensive; do
        local files_to_delete=$(ls -1t backups/${backup_type}_*.sql.gz 2>/dev/null | tail -n +$((keep_count + 1)))
        
        if [ -n "$files_to_delete" ]; then
            echo -e "${YELLOW}Removing old ${backup_type} backups...${NC}"
            echo "$files_to_delete" | while read -r file; do
                echo -e "  🗑️  Removing: $file"
                rm "$file"
            done
        fi
    done
    
    local remaining_backups=$(ls -1 backups/*.sql.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Cleanup complete! Remaining backups: $remaining_backups${NC}"
}

# Function to clean up specific user data (enhanced with backup)
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
    
    # Create backup before user cleanup
    create_backup "pre_user_cleanup" "Backup before cleaning up user: $target_email"
    
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
    echo -e "${RED}  • All NFS-e configurations and invoices${NC}"
    echo ""
    echo -e "${YELLOW}Type 'DELETE' to confirm (case-sensitive):${NC}"
    read -p "Confirmation: " confirmation
    
    if [ "$confirmation" != "DELETE" ]; then
        echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}🗑️  Starting cleanup for $target_email...${NC}"
    
    # Create temporary SQL file for cleanup (including NFS-e tables)
    local temp_sql_file=$(mktemp)
    cat > "$temp_sql_file" << EOF
-- Enhanced user cleanup script (including NFS-e)
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
  (SELECT COUNT(*) FROM calendar_events WHERE email = '$target_email') as calendar_events,
  (SELECT COUNT(*) FROM therapist_nfse_config WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')) as nfse_configs,
  (SELECT COUNT(*) FROM nfse_invoices WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')) as nfse_invoices;

-- Delete in correct order to respect foreign key constraints

-- 1. Delete NFS-e invoices for this therapist
DELETE FROM nfse_invoices 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 2. Delete NFS-e configuration for this therapist
DELETE FROM therapist_nfse_config 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 3. Delete check-ins for this therapist's sessions
DELETE FROM check_ins 
WHERE session_id IN (
  SELECT id FROM sessions 
  WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email')
);

-- 4. Delete calendar events for this therapist
DELETE FROM calendar_events WHERE email = '$target_email';

-- 5. Delete calendar webhooks for this therapist
DELETE FROM calendar_webhooks 
WHERE channel_id IN (
  SELECT CONCAT('lv-calendar-webhook-', id) FROM therapists WHERE email = '$target_email'
);

-- 6. Delete sessions for this therapist
DELETE FROM sessions 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 7. Delete patients for this therapist
DELETE FROM patients 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = '$target_email');

-- 8. Delete the therapist record
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

# Main command handling
case "$1" in
    "fresh")
        echo -e "${YELLOW}🗑️  Creating fresh database (WARNING: This will delete all existing data!)${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            create_backup "fresh" "Backup before fresh database creation"
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
        else
            create_backup "pre_schema" "Backup before schema update"
        fi
        run_sql "complete_schema.sql"
        echo -e "${GREEN}🎉 Schema installation complete!${NC}"
        ;;
    "add-nfse")
        add_nfse_support
        ;;
    "backup")
        create_backup "manual" "${2:-Manual backup}"
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "cleanup-backups")
        cleanup_backups
        ;;
    "cleanup-user")
        echo -e "${YELLOW}🧹 Cleaning up specific user data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        cleanup_user "$2"
        ;;
    "seed")
        echo -e "${YELLOW}🌱 Adding basic test data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        create_backup "pre_seed" "Backup before adding seed data"
        run_sql "seed/basic_seed_data.sql"
        echo -e "${GREEN}🎉 Basic test data added successfully!${NC}"
        ;;
    "comprehensive")
        echo -e "${YELLOW}🚀 Adding comprehensive payment test data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        create_backup "pre_comprehensive" "Backup before adding comprehensive data"
        echo -e "${BLUE}Loading comprehensive seed data in 4 parts...${NC}"
        run_sql "seed/01_therapist_seed.sql"
        run_sql "seed/02_patients_seed.sql"
        run_sql "seed/03_sessions_seed.sql"
        run_sql "seed/04_checkins_events_seed.sql"
        echo -e "${GREEN}🎉 Comprehensive payment test data loaded successfully!${NC}"
        ;;
    "check")
        echo -e "${YELLOW}🔍 Checking database schema and data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        psql -h $DB_HOST -U $DB_USER $DB_NAME < check_schema.sql
        ;;
    *)
        echo -e "${BLUE}Usage: $0 [command] [options]${NC}"
        echo
        echo -e "${YELLOW}🔄 Database Operations:${NC}"
        echo -e "  ${GREEN}fresh${NC}                - 🗑️  Create completely fresh database"
        echo -e "  ${GREEN}schema${NC}               - 📋 Install/update complete schema"
        echo -e "  ${GREEN}check${NC}                - 🔍 Verify schema and show data summary"
        echo
        echo -e "${YELLOW}🧾 NFS-e Operations:${NC}"
        echo -e "  ${PURPLE}add-nfse${NC}             - 🧾 Add NFS-e support to existing database (PRODUCTION SAFE)"
        echo
        echo -e "${YELLOW}💾 Backup & Restore:${NC}"
        echo -e "  ${GREEN}backup [description]${NC}  - 💾 Create compressed backup with description"
        echo -e "  ${GREEN}restore [backup_file]${NC} - 🔄 Restore from backup file"
        echo -e "  ${GREEN}cleanup-backups${NC}      - 🧹 Clean up old backup files"
        echo
        echo -e "${YELLOW}🌱 Test Data:${NC}"
        echo -e "  ${GREEN}seed${NC}                 - 🌱 Add basic test data"
        echo -e "  ${GREEN}comprehensive${NC}        - 🚀 Add comprehensive payment test data"
        echo
        echo -e "${YELLOW}👤 User Management:${NC}"
        echo -e "  ${GREEN}cleanup-user [email]${NC}  - 🧹 Remove all data for specific user"
        echo
        echo -e "${YELLOW}💡 Examples:${NC}"
        echo -e "  ${BLUE}# Production-safe NFS-e addition${NC}"
        echo -e "  $0 add-nfse"
        echo -e ""
        echo -e "  ${BLUE}# Create backup with description${NC}"
        echo -e "  $0 backup \"Before major update\""
        echo -e ""
        echo -e "  ${BLUE}# Restore from specific backup${NC}"
        echo -e "  $0 restore backups/manual_20241201_143022.sql.gz"
        echo -e ""
        echo -e "  ${BLUE}# Clean up old backups${NC}"
        echo -e "  $0 cleanup-backups"
        echo
        echo -e "${YELLOW}Database Info:${NC}"
        echo -e "  Host: $DB_HOST"
        echo -e "  User: $DB_USER"
        echo -e "  Database: $DB_NAME"
        echo
        echo -e "${GREEN}🛡️  All operations create automatic backups for safety!${NC}"
        ;;
esac