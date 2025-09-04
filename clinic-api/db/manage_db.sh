#!/bin/bash
# clinic-api/db/manage_db.sh
# Enhanced database management for LV Notas with production safety and environment support

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
PURPLE="\033[0;35m"
NC="\033[0m" # No Color

# Environment handling
ENVIRONMENT="local"
if [[ "$*" == *"--env=production"* ]]; then
    ENVIRONMENT="production"
    # Override database settings for production
    DB_HOST="localhost"  # Cloud SQL Proxy
    DB_USER="postgres"
    DB_NAME="clinic_db"
    DB_PORT="5433"  # Cloud SQL Proxy port
    
    echo -e "${BLUE}Using PRODUCTION environment${NC}"
    echo -e "${YELLOW}Make sure Cloud SQL Proxy is running on port 5433${NC}"
    echo -e "${YELLOW}    ./cloud_sql_proxy -instances=lv-notas:us-central1:clinic-db=tcp:5433 &${NC}"
    echo
elif [[ "$*" == *"--env=staging"* ]]; then
    ENVIRONMENT="staging"
    # Add staging settings if needed
    echo -e "${BLUE}Using STAGING environment${NC}"
else
    echo -e "${BLUE}Using LOCAL environment${NC}"
fi

# Load environment variables (for local environment)
if [ "$ENVIRONMENT" = "local" ] && [ -f ../.env ]; then
    export $(cat ../.env | grep -v "#" | xargs)
elif [ "$ENVIRONMENT" = "local" ]; then
    echo -e "${RED}Error: .env file not found in parent directory${NC}"
    exit 1
fi

# Database connection details (with environment override support)
DB_HOST=${DB_HOST:-${POSTGRES_HOST:-localhost}}
DB_USER=${DB_USER:-${POSTGRES_USER:-dankupfer}}
DB_NAME=${DB_NAME:-${POSTGRES_DB:-clinic_db}}
DB_PORT=${DB_PORT:-${POSTGRES_PORT:-5432}}

echo -e "${BLUE}LV Notas Database Manager${NC}"
echo -e "${BLUE}=============================${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo

# Function to run SQL files
run_sql() {
    echo -e "${YELLOW}Running $1...${NC}"
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME < $1; then
        echo -e "${GREEN}$1 completed successfully${NC}"
        echo
    else
        echo -e "${RED}Error running $1${NC}"
        exit 1
    fi
}

# Function to check if database exists
check_db_exists() {
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
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
    local backup_file="backups/${backup_type}_${ENVIRONMENT}_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    echo -e "${YELLOW}Creating ${backup_type} backup for ${ENVIRONMENT}...${NC}"
    echo -e "${BLUE}Description: ${description}${NC}"
    
    # Create the backup
    if pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > $backup_file; then
        # Compress the backup
        gzip $backup_file
        
        # Get file size
        local file_size=$(du -h $compressed_file | cut -f1)
        
        echo -e "${GREEN}Backup created successfully!${NC}"
        echo -e "${GREEN}File: $compressed_file${NC}"
        echo -e "${GREEN}Size: $file_size${NC}"
        
        # Count existing backups and show cleanup info
        local backup_count=$(ls -1 backups/${backup_type}_${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l)
        echo -e "${BLUE}Total ${backup_type} backups for ${ENVIRONMENT}: $backup_count${NC}"
        
        if [ $backup_count -gt 10 ]; then
            echo -e "${YELLOW}You have more than 10 ${backup_type} backups. Consider cleanup.${NC}"
            echo -e "${YELLOW}Run: $0 cleanup-backups --env=${ENVIRONMENT}${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}Backup failed!${NC}"
        return 1
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo -e "${BLUE}Available backups for ${ENVIRONMENT}:${NC}"
        ls -la backups/*_${ENVIRONMENT}_*.sql.gz 2>/dev/null | while read -r line; do
            echo -e "${YELLOW}  $line${NC}"
        done
        echo
        echo -e "${YELLOW}Enter backup filename to restore:${NC}"
        read -p "Backup file: " backup_file
    fi
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${RED}WARNING: This will COMPLETELY REPLACE the current database!${NC}"
    echo -e "${RED}Environment: $ENVIRONMENT${NC}"
    echo -e "${RED}Database: $DB_NAME${NC}"
    echo -e "${RED}Backup: $backup_file${NC}"
    echo ""
    echo -e "${YELLOW}Type 'RESTORE' to confirm (case-sensitive):${NC}"
    read -p "Confirmation: " confirmation
    
    if [ "$confirmation" != "RESTORE" ]; then
        echo -e "${YELLOW}Restore cancelled${NC}"
        return 1
    fi
    
    # Create pre-restore backup
    create_backup "pre_restore" "Automatic backup before restore operation"
    
    echo -e "${YELLOW}Restoring database from backup...${NC}"
    
    # Drop and recreate database
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    
    # Restore from backup
    if gunzip -c $backup_file | psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME; then
        echo -e "${GREEN}Database restored successfully!${NC}"
    else
        echo -e "${RED}Restore failed!${NC}"
        exit 1
    fi
}

# Function to cleanup old backups
cleanup_backups() {
    echo -e "${YELLOW}Backup Cleanup for ${ENVIRONMENT}${NC}"
    echo -e "${YELLOW}=================${NC}"
    echo ""
    
    if [ ! -d "backups" ]; then
        echo -e "${BLUE}No backups directory found${NC}"
        return 0
    fi
    
    local total_backups=$(ls -1 backups/*_${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l)
    
    if [ $total_backups -eq 0 ]; then
        echo -e "${BLUE}No backups found for ${ENVIRONMENT}${NC}"
        return 0
    fi
    
    echo -e "${BLUE}Found $total_backups backup files for ${ENVIRONMENT}${NC}"
    echo ""
    echo -e "${BLUE}Backup breakdown:${NC}"
    
    # Show backup types and counts
    for backup_type in manual auto pre_restore pre_nfse fresh comprehensive; do
        local count=$(ls -1 backups/${backup_type}_${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l)
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
            echo -e "${BLUE}All backups for ${ENVIRONMENT}:${NC}"
            ls -la backups/*_${ENVIRONMENT}_*.sql.gz 2>/dev/null
            return 0
            ;;
        5) 
            echo -e "${YELLOW}Cleanup cancelled${NC}"
            return 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            return 1
            ;;
    esac
    
    echo -e "${YELLOW}Cleaning up backups (keeping last $keep_count of each type)...${NC}"
    
    # Cleanup each backup type
    for backup_type in manual auto pre_restore pre_nfse fresh comprehensive; do
        local files_to_delete=$(ls -1t backups/${backup_type}_${ENVIRONMENT}_*.sql.gz 2>/dev/null | tail -n +$((keep_count + 1)))
        
        if [ -n "$files_to_delete" ]; then
            echo -e "${YELLOW}Removing old ${backup_type} backups...${NC}"
            echo "$files_to_delete" | while read -r file; do
                echo -e "  Removing: $file"
                rm "$file"
            done
        fi
    done
    
    local remaining_backups=$(ls -1 backups/*_${ENVIRONMENT}_*.sql.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}Cleanup complete! Remaining backups for ${ENVIRONMENT}: $remaining_backups${NC}"
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
        echo -e "${RED}Invalid email format: $target_email${NC}"
        exit 1
    fi
    
    # Create backup before user cleanup
    create_backup "pre_user_cleanup" "Backup before cleaning up user: $target_email"
    
    echo ""
    echo -e "${RED}WARNING: This will PERMANENTLY DELETE all data for:${NC}"
    echo -e "${RED}    $target_email${NC}"
    echo -e "${RED}    Environment: $ENVIRONMENT${NC}"
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
        echo -e "${YELLOW}Cleanup cancelled${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}Starting cleanup for $target_email...${NC}"
    
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
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -f "$temp_sql_file"; then
        echo ""
        echo -e "${GREEN}Cleanup completed successfully!${NC}"
        echo -e "${GREEN}All data for $target_email has been removed from ${ENVIRONMENT}${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "${YELLOW}  1. Clear browser localStorage/cookies${NC}"
        echo -e "${YELLOW}  2. Test fresh onboarding process${NC}"
        echo -e "${YELLOW}  3. Optionally run: $0 check --env=${ENVIRONMENT}${NC}"
        echo ""
        echo -e "${GREEN}Ready for fresh testing!${NC}"
    else
        echo -e "${RED}Cleanup failed. Check the error messages above.${NC}"
        exit 1
    fi
    
    # Clean up temp file
    rm "$temp_sql_file"
}

# Main command handling
case "$1" in
    "fresh")
        echo -e "${YELLOW}Creating fresh database (WARNING: This will delete all existing data!)${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            create_backup "fresh" "Backup before fresh database creation"
            echo -e "${YELLOW}Dropping and recreating database...${NC}"
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            echo -e "${GREEN}Fresh database created with complete schema!${NC}"
        else
            echo -e "${RED}Operation cancelled${NC}"
        fi
        ;;
    "schema")
        echo -e "${YELLOW}Installing complete schema...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${YELLOW}Database doesn't exist, creating it...${NC}"
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        else
            create_backup "pre_schema" "Backup before schema update"
        fi
        run_sql "complete_schema.sql"
        echo -e "${GREEN}Schema installation complete!${NC}"
        ;;
    "set-nfse-test-mode")
        echo -e "${YELLOW}Setting NFS-e test mode...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist. Run '$0 schema --env=${ENVIRONMENT}' first.${NC}"
            exit 1
        fi
        
        local test_mode="$2"
        if [ -z "$test_mode" ]; then
            echo -e "${BLUE}Current NFS-e configuration:${NC}"
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
                SELECT key, value, description 
                FROM app_configuration 
                WHERE key IN ('nfse_test_mode', 'nfse_current_provider')
                ORDER BY key;
            "
            echo ""
            echo -e "${YELLOW}Set test mode to:${NC}"
            echo -e "  1. true (sandbox/test mode - safe for development)"  
            echo -e "  2. false (production mode - generates real invoices)"
            echo ""
            read -p "Choose [1-2]: " choice
            case $choice in
                1) test_mode="true" ;;
                2) test_mode="false" ;;
                *) 
                    echo -e "${RED}Invalid choice${NC}"
                    exit 1
                    ;;
            esac
        fi
        
        if [ "$test_mode" != "true" ] && [ "$test_mode" != "false" ]; then
            echo -e "${RED}Invalid test mode. Use 'true' or 'false'${NC}"
            exit 1
        fi
        
        # Confirmation for production mode
        if [ "$test_mode" = "false" ]; then
            echo ""
            echo -e "${RED}WARNING: Setting to PRODUCTION mode!${NC}"
            echo -e "${RED}Environment: $ENVIRONMENT${NC}"
            echo -e "${RED}This will generate REAL TAX INVOICES that affect:${NC}"
            echo -e "${RED}  • Municipal tax records${NC}"
            echo -e "${RED}  • Patient tax deductions${NC}"  
            echo -e "${RED}  • Your business accounting${NC}"
            echo ""
            echo -e "${YELLOW}Type 'PRODUCTION' to confirm (case-sensitive):${NC}"
            read -p "Confirmation: " confirmation
            
            if [ "$confirmation" != "PRODUCTION" ]; then
                echo -e "${YELLOW}Operation cancelled${NC}"
                exit 1
            fi
        fi
        
        # Update the configuration
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            UPDATE app_configuration 
            SET value = '$test_mode', updated_at = CURRENT_TIMESTAMP 
            WHERE key = 'nfse_test_mode';
        "
        
        echo -e "${GREEN}NFS-e test mode updated successfully!${NC}"
        echo -e "${GREEN}Test Mode: $test_mode${NC}"
        echo -e "${GREEN}Current Provider: $(psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -tAc "SELECT value FROM app_configuration WHERE key = 'nfse_current_provider'")${NC}"
        echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
        
        # Show current status
        echo ""
        echo -e "${BLUE}Current NFS-e Configuration:${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            SELECT 
                key,
                value,
                CASE 
                    WHEN key = 'nfse_test_mode' AND value = 'true' THEN 'SANDBOX MODE'
                    WHEN key = 'nfse_test_mode' AND value = 'false' THEN 'PRODUCTION MODE'
                    ELSE value
                END as status
            FROM app_configuration 
            WHERE key IN ('nfse_test_mode', 'nfse_current_provider')
            ORDER BY key;
        "
        ;;
    "show-nfse-status")
        echo -e "${YELLOW}NFS-e Integration Status${NC}"
        echo -e "${YELLOW}==========================${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        echo ""
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist.${NC}"
            exit 1
        fi
        
        # Show configuration
        echo -e "${BLUE}Configuration:${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            SELECT 
                key,
                value,
                CASE 
                    WHEN key = 'nfse_test_mode' AND value = 'true' THEN 'Test/Sandbox mode - Safe for testing'
                    WHEN key = 'nfse_test_mode' AND value = 'false' THEN 'Production mode - Real invoices'
                    WHEN key = 'nfse_current_provider' THEN 'Current provider'
                    ELSE description
                END as description
            FROM app_configuration 
            WHERE key IN ('nfse_test_mode', 'nfse_current_provider')
            ORDER BY key;
        "
        
        echo ""
        echo -e "${BLUE}Therapist Configurations:${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            SELECT 
                t.nome as therapist_name,
                t.email,
                CASE WHEN tnc.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_nfse_config,
                tnc.certificate_status,
                tnc.company_cnpj,
                tnc.provider_company_id IS NOT NULL as registered_with_provider
            FROM therapists t
            LEFT JOIN therapist_nfse_config tnc ON t.id = tnc.therapist_id
            ORDER BY t.nome;
        "
        
        echo ""
        echo -e "${BLUE}Invoice Summary:${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            SELECT 
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN invoice_status = 'issued' THEN 1 END) as issued_invoices,
                COUNT(CASE WHEN invoice_status = 'pending' THEN 1 END) as pending_invoices,
                COUNT(CASE WHEN invoice_status = 'error' THEN 1 END) as error_invoices,
                SUM(CASE WHEN invoice_status = 'issued' THEN invoice_amount ELSE 0 END) as total_amount_issued
            FROM nfse_invoices;
        "
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
    "list-users")
        echo -e "${YELLOW}Listing registered users...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist.${NC}"
            exit 1
        fi
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME -c "
            SELECT 
                id,
                email,
                display_name,
                is_active,
                email_verified,
                last_login_at,
                created_at
            FROM user_credentials 
            ORDER BY created_at DESC;
        "
        ;;
    "cleanup-user")
        echo -e "${YELLOW}Cleaning up specific user data...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist. Run '$0 schema --env=${ENVIRONMENT}' first.${NC}"
            exit 1
        fi
        cleanup_user "$2"
        ;;
    "seed")
        echo -e "${YELLOW}Adding basic test data...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist. Run '$0 schema --env=${ENVIRONMENT}' first.${NC}"
            exit 1
        fi
        create_backup "pre_seed" "Backup before adding seed data"
        run_sql "seed/basic_seed_data.sql"
        echo -e "${GREEN}Basic test data added successfully!${NC}"
        ;;
    "comprehensive")
        echo -e "${YELLOW}Adding comprehensive payment test data...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist. Run '$0 schema --env=${ENVIRONMENT}' first.${NC}"
            exit 1
        fi
        create_backup "pre_comprehensive" "Backup before adding comprehensive data"
        echo -e "${BLUE}Loading comprehensive seed data in 4 parts...${NC}"
        run_sql "seed/01_therapist_seed.sql"
        run_sql "seed/02_patients_seed.sql"
        run_sql "seed/03_sessions_seed.sql"
        run_sql "seed/04_checkins_events_seed.sql"
        echo -e "${GREEN}Comprehensive payment test data loaded successfully!${NC}"
        ;;
    "check")
        echo -e "${YELLOW}Checking database schema and data...${NC}"
        echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
        if ! check_db_exists; then
            echo -e "${RED}Database doesn't exist. Run '$0 schema --env=${ENVIRONMENT}' first.${NC}"
            exit 1
        fi
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME < check_schema.sql
        ;;
    *)
        echo -e "${BLUE}Usage: $0 [command] [options]${NC}"
        echo
        echo -e "${YELLOW}Database Operations:${NC}"
        echo -e "  ${GREEN}fresh${NC}                - Create completely fresh database"
        echo -e "  ${GREEN}schema${NC}               - Install/update complete schema"
        echo -e "  ${GREEN}check${NC}                - Verify schema and show data summary"
        echo
        echo -e "${YELLOW}NFS-e Operations:${NC}"
        echo -e "  ${GREEN}set-nfse-test-mode [true|false]${NC} - Set test/production mode for NFS-e"
        echo -e "  ${GREEN}show-nfse-status${NC}     - Show NFS-e configuration and invoice status"
        echo
        echo -e "${YELLOW}Backup & Restore:${NC}"
        echo -e "  ${GREEN}backup [description]${NC}  - Create compressed backup with description"
        echo -e "  ${GREEN}restore [backup_file]${NC} - Restore from backup file"
        echo -e "  ${GREEN}cleanup-backups${NC}      - Clean up old backup files"
        echo
        echo -e "${YELLOW}Test Data:${NC}"
        echo -e "  ${GREEN}seed${NC}                 - Add basic test data"
        echo -e "  ${GREEN}comprehensive${NC}        - Add comprehensive payment test data"
        echo
        echo -e "${YELLOW}User Management:${NC}"
        echo -e "  ${GREEN}cleanup-user [email]${NC}  - Remove all data for specific user"
        echo -e "  ${GREEN}list-users${NC}           - List all registered users"
        echo
        echo -e "${YELLOW}Environment Options:${NC}"
        echo -e "  ${GREEN}--env=local${NC}      - Use local database (default)"
        echo -e "  ${GREEN}--env=production${NC} - Use production database via Cloud SQL Proxy"
        echo -e "  ${GREEN}--env=staging${NC}    - Use staging database"
        echo
        echo -e "${YELLOW}Examples:${NC}"
        echo -e "  ${BLUE}# Set NFS-e to test mode${NC}"
        echo -e "  $0 set-nfse-test-mode true --env=production"
        echo -e ""
        echo -e "  ${BLUE}# Create backup with description${NC}"
        echo -e "  $0 backup \"Before major update\" --env=production"
        echo -e ""
        echo -e "  ${BLUE}# Show NFS-e status${NC}"
        echo -e "  $0 show-nfse-status --env=production"
        echo
        echo -e "${YELLOW}Database Info:${NC}"
        echo -e "  Environment: $ENVIRONMENT"
        echo -e "  Host: $DB_HOST:$DB_PORT"
        echo -e "  User: $DB_USER"
        echo -e "  Database: $DB_NAME"
        echo
        echo -e "${GREEN}All operations create automatic backups for safety!${NC}"
        ;;
esac