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
        echo -e "${YELLOW}🌱 Adding test data...${NC}"
        if ! check_db_exists; then
            echo -e "${RED}❌ Database doesn't exist. Run '$0 schema' first.${NC}"
            exit 1
        fi
        run_sql "seed_data.sql"
        echo -e "${GREEN}🎉 Test data added successfully!${NC}"
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
        echo -e "${YELLOW}🔄 Resetting with fresh schema and test data...${NC}"
        read -p "This will delete all data and recreate everything. Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
            run_sql "complete_schema.sql"
            run_sql "seed_data.sql"
            echo -e "${GREEN}🎉 Database reset complete with test data!${NC}"
        else
            echo -e "${RED}❌ Operation cancelled${NC}"
        fi
        ;;
    "backup")
        echo -e "${YELLOW}💾 Creating database backup...${NC}"
        backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > $backup_file
        echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
        ;;
    *)
        echo -e "${BLUE}Usage: $0 [command]${NC}"
        echo
        echo -e "${YELLOW}Available commands:${NC}"
        echo -e "  ${GREEN}fresh${NC}    - 🗑️  Create completely fresh database (deletes all data)"
        echo -e "  ${GREEN}schema${NC}   - 📋 Install/update schema only"
        echo -e "  ${GREEN}seed${NC}     - 🌱 Add test data to existing database"
        echo -e "  ${GREEN}check${NC}    - 🔍 Verify schema and show data summary"
        echo -e "  ${GREEN}reset${NC}    - 🔄 Fresh database + schema + test data"
        echo -e "  ${GREEN}backup${NC}   - 💾 Create database backup"
        echo
        echo -e "${YELLOW}Examples:${NC}"
        echo -e "  $0 fresh    # Complete fresh start (development)"
        echo -e "  $0 schema   # Update schema only (production)"
        echo -e "  $0 seed     # Add test data (development)"
        echo -e "  $0 check    # Verify everything is working"
        echo
        echo -e "${YELLOW}Database Info:${NC}"
        echo -e "  Host: $DB_HOST"
        echo -e "  User: $DB_USER"
        echo -e "  Database: $DB_NAME"
        ;;
esac