#!/bin/bash
# clinic-api/db/session-config.sh
# Quick script to change session timeout configurations for testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection settings
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-dankupfer}
DB_NAME=${POSTGRES_DB:-clinic_db}

echo -e "${BLUE}🕐 Session Timeout Configuration Tool${NC}"
echo "======================================"

# Function to execute SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo -e "${YELLOW}Executing: $description${NC}"
    echo "SQL: $sql"
    
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success: $description${NC}"
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        exit 1
    fi
    echo ""
}

# Function to show current configuration
show_current_config() {
    echo -e "${BLUE}📊 Current Session Configuration:${NC}"
    
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Default Settings' as source,
        column_default as inactive_timeout_minutes,
        (SELECT column_default FROM information_schema.columns 
         WHERE table_name = 'user_sessions' AND column_name = 'warning_timeout_minutes') as warning_timeout_minutes
    FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'inactive_timeout_minutes'
    
    UNION ALL
    
    SELECT 
        'Active Sessions (' || COUNT(*) || ')' as source,
        inactive_timeout_minutes::text,
        warning_timeout_minutes::text
    FROM user_sessions 
    WHERE status = 'active'
    GROUP BY inactive_timeout_minutes, warning_timeout_minutes
    ORDER BY source;
    "
    echo ""
}

# Predefined configurations
set_rapid_testing() {
    echo -e "${YELLOW}⚡ Setting RAPID TESTING mode (2 minutes)${NC}"
    execute_sql "
    ALTER TABLE user_sessions 
    ALTER COLUMN inactive_timeout_minutes SET DEFAULT 2,
    ALTER COLUMN warning_timeout_minutes SET DEFAULT 1;
    
    UPDATE user_sessions 
    SET 
      inactive_timeout_minutes = 2,
      warning_timeout_minutes = 1,
      expires_at = last_activity_at + INTERVAL '2 minutes'
    WHERE status = 'active';
    " "Set 2-minute sessions for rapid testing"
    
    echo -e "${GREEN}⚡ RAPID TESTING: Sessions expire in 2 minutes, warning at 1 minute${NC}"
    echo -e "${YELLOW}Perfect for: Testing session timeout modal with reasonable time${NC}"
}

set_development() {
    echo -e "${YELLOW}🛠️ Setting DEVELOPMENT mode (30 minutes)${NC}"
    execute_sql "
    ALTER TABLE user_sessions 
    ALTER COLUMN inactive_timeout_minutes SET DEFAULT 30,
    ALTER COLUMN warning_timeout_minutes SET DEFAULT 2;
    
    UPDATE user_sessions 
    SET 
      inactive_timeout_minutes = 30,
      warning_timeout_minutes = 2,
      expires_at = last_activity_at + INTERVAL '30 minutes'
    WHERE status = 'active';
    " "Set 30-minute sessions for development"
    
    echo -e "${GREEN}🛠️ DEVELOPMENT: Sessions expire in 30 minutes, warning at 2 minutes${NC}"
    echo -e "${YELLOW}Perfect for: Regular development work${NC}"
}

set_production() {
    echo -e "${YELLOW}🚀 Setting PRODUCTION mode (1 hour)${NC}"
    execute_sql "
    ALTER TABLE user_sessions 
    ALTER COLUMN inactive_timeout_minutes SET DEFAULT 60,
    ALTER COLUMN warning_timeout_minutes SET DEFAULT 5;
    
    UPDATE user_sessions 
    SET 
      inactive_timeout_minutes = 60,
      warning_timeout_minutes = 5,
      expires_at = last_activity_at + INTERVAL '60 minutes'
    WHERE status = 'active';
    " "Set 1-hour sessions for production"
    
    echo -e "${GREEN}🚀 PRODUCTION: Sessions expire in 1 hour, warning at 5 minutes${NC}"
    echo -e "${YELLOW}Perfect for: Production deployment${NC}"
}

set_extended() {
    echo -e "${YELLOW}⏰ Setting EXTENDED mode (2 hours)${NC}"
    execute_sql "
    ALTER TABLE user_sessions 
    ALTER COLUMN inactive_timeout_minutes SET DEFAULT 120,
    ALTER COLUMN warning_timeout_minutes SET DEFAULT 10;
    
    UPDATE user_sessions 
    SET 
      inactive_timeout_minutes = 120,
      warning_timeout_minutes = 10,
      expires_at = last_activity_at + INTERVAL '120 minutes'
    WHERE status = 'active';
    " "Set 2-hour sessions for extended work"
    
    echo -e "${GREEN}⏰ EXTENDED: Sessions expire in 2 hours, warning at 10 minutes${NC}"
    echo -e "${YELLOW}Perfect for: Long therapy sessions or admin work${NC}"
}

set_custom() {
    echo -e "${YELLOW}🎛️ Custom session configuration${NC}"
    echo "Enter session duration in minutes:"
    read -p "Session duration (minutes): " session_minutes
    read -p "Warning time (minutes): " warning_minutes
    
    if ! [[ "$session_minutes" =~ ^[0-9]+$ ]] || ! [[ "$warning_minutes" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Please enter valid numbers${NC}"
        exit 1
    fi
    
    if [ "$warning_minutes" -gt "$session_minutes" ]; then
        echo -e "${RED}❌ Warning time cannot be greater than session duration${NC}"
        exit 1
    fi
    
    execute_sql "
    ALTER TABLE user_sessions 
    ALTER COLUMN inactive_timeout_minutes SET DEFAULT $session_minutes,
    ALTER COLUMN warning_timeout_minutes SET DEFAULT $warning_minutes;
    
    UPDATE user_sessions 
    SET 
      inactive_timeout_minutes = $session_minutes,
      warning_timeout_minutes = $warning_minutes,
      expires_at = last_activity_at + INTERVAL '$session_minutes minutes'
    WHERE status = 'active';
    " "Set custom $session_minutes-minute sessions with $warning_minutes-minute warning"
    
    echo -e "${GREEN}🎛️ CUSTOM: Sessions expire in $session_minutes minutes, warning at $warning_minutes minutes${NC}"
}

# Main menu
main_menu() {
    echo -e "${BLUE}Choose a session configuration:${NC}"
    echo "1. ⚡ Rapid Testing (2 minutes) - Quick modal testing"  # Updated description
    echo "2. 🛠️ Development (30 minutes) - Regular development"  
    echo "3. 🚀 Production (1 hour) - Standard production"
    echo "4. ⏰ Extended (2 hours) - Long sessions"
    echo "5. 🎛️ Custom - Set your own timing"
    echo "6. 📊 Show current configuration"
    echo "7. ❌ Exit"
    echo ""
    
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1) set_rapid_testing ;;
        2) set_development ;;
        3) set_production ;;
        4) set_extended ;;
        5) set_custom ;;
        6) show_current_config ;;
        7) echo -e "${BLUE}👋 Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}❌ Invalid choice${NC}"; main_menu ;;
    esac
}

# Check if database connection is available
echo -e "${YELLOW}🔍 Checking database connection...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "Please check your database connection settings:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT" 
    echo "  User: $DB_USER"
    echo "  Database: $DB_NAME"
    echo ""
    echo "Make sure POSTGRES_PASSWORD environment variable is set."
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Show current config first
show_current_config

# Start main menu
main_menu

# After configuration change, show new config
echo ""
echo -e "${BLUE}📊 Updated Configuration:${NC}"
show_current_config

echo -e "${GREEN}✅ Session configuration updated successfully!${NC}"
echo -e "${YELLOW}💡 Tip: Refresh your browser to see the new session timing in the modal${NC}"