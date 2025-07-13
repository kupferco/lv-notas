#!/bin/bash
# clinic-api/db/run_schemas.sh
# Script to run all schema files in the correct order

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_USER=${POSTGRES_USER:-dankupfer}
DB_NAME=${POSTGRES_DB:-clinic_db}

echo -e "${BLUE}🚀 LV Notas Database Schema Setup${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo -e "Database: ${YELLOW}$DB_NAME${NC}"
echo -e "Host: ${YELLOW}$DB_HOST${NC}"
echo -e "User: ${YELLOW}$DB_USER${NC}"
echo ""

# Check if schemas directory exists
if [ ! -d "schemas" ]; then
    echo -e "${RED}❌ Error: schemas directory not found!${NC}"
    echo -e "Please run this script from the clinic-api/db directory"
    exit 1
fi

# Array of schema files in execution order
SCHEMA_FILES=(
    "01_core_tables.sql"
    "02_sessions_calendar.sql" 
    "03_onboarding.sql"
    "04_billing_history.sql"
    "05_payments.sql"
    "06_settings.sql"
    "07_views.sql"
    "08_functions.sql"
    "09_seed_data.sql"
)

# Function to run a single schema file
run_schema_file() {
    local file=$1
    local file_path="schemas/$file"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ Error: $file not found!${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📄 Running $file...${NC}"
    
    if psql -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" -f "$file_path" -q; then
        echo -e "${GREEN}✅ $file completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Error running $file${NC}"
        return 1
    fi
}

# Main execution
echo -e "${BLUE}Starting schema setup...${NC}"
echo ""

TOTAL_FILES=${#SCHEMA_FILES[@]}
COMPLETED=0

for file in "${SCHEMA_FILES[@]}"; do
    if run_schema_file "$file"; then
        ((COMPLETED++))
        echo -e "${GREEN}Progress: $COMPLETED/$TOTAL_FILES files completed${NC}"
    else
        echo -e "${RED}❌ Schema setup failed at $file${NC}"
        echo -e "${RED}Please fix the error and run again${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${GREEN}🎉 All schema files completed successfully!${NC}"
echo -e "${GREEN}✅ Database setup complete${NC}"
echo ""
echo -e "${BLUE}What was created:${NC}"
echo -e "• Core tables (therapists, patients)"
echo -e "• Sessions and calendar integration"
echo -e "• Onboarding and import system"
echo -e "• Billing history tracking"
echo -e "• Payment management system"
echo -e "• ⭐ Settings tables for persistent UI preferences"
echo -e "• Database views for easy access"
echo -e "• Helper functions for operations"
echo -e "• 🌱 Seed data with sample therapist, patients, and sessions"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your backend API to support settings endpoints"
echo -e "2. Update frontend to load/save settings from database"
echo -e "3. Test the new persistent settings functionality"