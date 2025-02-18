#!/bin/bash

# Colors for output
GREEN="[0;32m"
YELLOW="[1;33m"
NC="[0m" # No Color

# Function to run SQL files
run_sql() {
    echo -e "${YELLOW}Running $1...${NC}"
    psql -h localhost -U $POSTGRES_USER $POSTGRES_DB < $1
    echo -e "${GREEN}Done!${NC}
"
}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v "#" | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

echo -e "${YELLOW}Database Management Script${NC}
"

case "$1" in
    "schema")
        run_sql "db/001_initial_schema.sql"
        ;;
    "seed")
        run_sql "db/seed/001_insert_basic_data.sql"
        run_sql "db/seed/002_insert_sessions.sql"
        run_sql "db/seed/003_insert_checkins.sql"
        ;;
    "check")
        echo -e "${YELLOW}Checking Therapists:${NC}"
        psql -h localhost -U $POSTGRES_USER $POSTGRES_DB -c "SELECT * FROM therapists;"
        echo -e "
${YELLOW}Checking Patients:${NC}"
        psql -h localhost -U $POSTGRES_USER $POSTGRES_DB -c "SELECT * FROM patients;"
        echo -e "
${YELLOW}Checking Sessions:${NC}"
        psql -h localhost -U $POSTGRES_USER $POSTGRES_DB -c "SELECT * FROM sessions;"
        echo -e "
${YELLOW}Checking Check-ins:${NC}"
        psql -h localhost -U $POSTGRES_USER $POSTGRES_DB -c "SELECT * FROM check_ins;"
        ;;
    "all")
        run_sql "db/001_initial_schema.sql"
        run_sql "db/seed/001_insert_basic_data.sql"
        run_sql "db/seed/002_insert_sessions.sql"
        run_sql "db/seed/003_insert_checkins.sql"
        ;;
    *)
        echo "Usage: $0 [schema|seed|check|all]"
        echo "  schema: Create database schema"
        echo "  seed: Insert all test data (therapists, patients, sessions, and check-ins)"
        echo "  check: View current data in all tables"
        echo "  all: Run all operations in sequence"
        ;;
esac
