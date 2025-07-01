#!/bin/bash
# db/scripts/setup-test-calendar.sh

echo "🗓️ LV Notas - Calendar Test Data Setup"
echo "======================================"

# Navigate to the clinic-api root directory where .env and service account are located
cd "$(dirname "$0")/.."

# Debug: Show current directory
echo "🔍 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la | head -10

# Check for service account key
if [ ! -f "service-account-key.json" ]; then
    echo ""
    echo "❌ Error: service-account-key.json not found in: $(pwd)"
    echo "📋 Looking for files containing 'service' or 'key':"
    find . -maxdepth 2 -name "*service*" -o -name "*key*.json" 2>/dev/null
    echo ""
    echo "Please ensure service-account-key.json is in the clinic-api root directory"
    exit 1
fi

echo "✅ Found service-account-key.json"

# Load environment variables if .env exists
if [ -f ".env" ]; then
    source .env
fi

# Ask for calendar ID - always give user choice
echo ""
echo "📅 Google Calendar Setup"
echo "========================"

if [ -n "$GOOGLE_CALENDAR_ID" ]; then
    echo "✅ Found calendar in .env: $GOOGLE_CALENDAR_ID"
    echo ""
    echo "Calendar Options:"
    echo "1) Use calendar from .env: $GOOGLE_CALENDAR_ID"
    echo "2) Use Dan's test calendar (hardcoded)"
    echo "3) Use a different calendar"
    echo ""
    read -p "📝 Choose option (1, 2, or 3): " calendar_choice
    
    case $calendar_choice in
        2)
            GOOGLE_CALENDAR_ID="6f3842a5e7b8b63095e840cc28684fd52e17ff25ef173e49b2e5219ed676f652@group.calendar.google.com"
            echo "✅ Using Dan's test calendar"
            ;;
        3)
            echo ""
            echo "📝 Enter a different Calendar ID:"
            echo "💡 You can use 'primary' for your main calendar"
            read -p "Calendar ID: " NEW_CALENDAR_ID
            if [ -n "$NEW_CALENDAR_ID" ]; then
                GOOGLE_CALENDAR_ID="$NEW_CALENDAR_ID"
            fi
            ;;
        1|*)
            # Keep existing calendar from .env
            ;;
    esac
else
    echo "No calendar found in .env file."
    echo ""
    echo "Calendar Options:"
    echo "1) Use Dan's test calendar (hardcoded)"
    echo "2) Use 'primary' (your main calendar)"
    echo "3) Enter a different calendar ID"
    echo ""
    read -p "📝 Choose option (1, 2, or 3): " calendar_choice
    
    case $calendar_choice in
        1)
            GOOGLE_CALENDAR_ID="6f3842a5e7b8b63095e840cc28684fd52e17ff25ef173e49b2e5219ed676f652@group.calendar.google.com"
            echo "✅ Using Dan's test calendar"
            echo "⚠️  Note: Make sure to share this calendar with your service account!"
            ;;
        2)
            GOOGLE_CALENDAR_ID="primary"
            echo "✅ Using your primary calendar"
            ;;
        3)
            echo ""
            echo "To find your Calendar ID:"
            echo "1. Go to Google Calendar (calendar.google.com)"
            echo "2. On the left, find the calendar you want to use"
            echo "3. Click the 3 dots next to the calendar name"
            echo "4. Click 'Settings and sharing'"
            echo "5. Scroll down to 'Calendar ID' section"
            echo "6. Copy the Calendar ID"
            echo ""
            read -p "📝 Enter your Calendar ID: " GOOGLE_CALENDAR_ID
            ;;
    esac
fi

if [ -z "$GOOGLE_CALENDAR_ID" ]; then
    echo "❌ Calendar ID cannot be empty"
    exit 1
fi

echo ""
echo "✅ Using calendar: $GOOGLE_CALENDAR_ID"

# Ask for data type
echo ""
echo "📊 Test Data Type"
echo "================="
echo ""
echo "What type of test data would you like to create?"
echo ""
echo "1) 📝 Basic Sample (5 patients, ~20 events)"
echo "   • Quick testing of the grouped import feature"
echo "   • Each patient has 3-5 sessions"
echo "   • Perfect for development and quick demos"
echo ""
echo "2) 🔥 Full Simulation (20 patients, ~300 events)"  
echo "   • Realistic therapy practice simulation"
echo "   • Each patient has 10-20 recurring sessions"
echo "   • Tests the real-world scenario (like your mom's calendar)"
echo "   • Shows the power of the new grouped patient import"
echo ""
read -p "📝 Choose data type (1 or 2): " data_type

if [ -z "$data_type" ]; then
    data_type=1
fi

echo ""
if [ "$data_type" = "2" ]; then
    echo "🔥 Creating full simulation with 20+ patients and hundreds of events"
    DATA_TYPE="full"
else
    echo "📝 Creating basic sample with 5 patients for quick testing"
    DATA_TYPE="basic"
fi

# Check if the TypeScript file exists
if [ ! -f "scripts/generateTestCalendarData.ts" ]; then
    echo ""
    echo "❌ Error: generateTestCalendarData.ts not found in scripts/"
    echo "🔍 Looking for the file..."
    find . -name "generateTestCalendarData.ts" -type f 2>/dev/null
    echo ""
    echo "📝 Current directory structure:"
    ls -la scripts/ 2>/dev/null || echo "scripts/ directory not found"
    echo ""
    echo "Please ensure the file is at: $(pwd)/scripts/generateTestCalendarData.ts"
    exit 1
fi

echo "✅ Found generateTestCalendarData.ts"
echo ""

# Execute: clear then generate in one go
echo "🚀 Setting up test data..."

if [ "$data_type" = "2" ]; then
    echo "🔥 Full simulation: clearing existing data then generating 20 patients with ~300 sessions"
else
    echo "📝 Basic sample: clearing existing data then generating 5 patients with ~15 sessions"
fi

echo ""
echo "📊 Progress:"
echo "  [1/2] 🧹 Clearing existing calendar events..."

GOOGLE_CALENDAR_ID="$GOOGLE_CALENDAR_ID" npx tsx scripts/generateTestCalendarData.ts clear

echo ""
echo "  [2/2] 📅 Creating new test data..."

if [ "$data_type" = "2" ]; then
    GOOGLE_CALENDAR_ID="$GOOGLE_CALENDAR_ID" DATA_TYPE="full" npx tsx scripts/generateTestCalendarData.ts generate
else
    GOOGLE_CALENDAR_ID="$GOOGLE_CALENDAR_ID" DATA_TYPE="basic" npx tsx scripts/generateTestCalendarData.ts generate
fi

echo ""
echo "🎉 Test data setup complete!"

echo ""
echo "✅ Calendar setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start your LV Notas app: npm start"
echo "2. Go through the onboarding process"
echo "3. Test the new grouped patient import"
echo ""
if [ "$data_type" = "2" ]; then
    echo "📊 You should see:"
    echo "   • 20 unique patients instead of 300+ individual events"
    echo "   • Each patient grouped with their recurring sessions"
    echo "   • Much more manageable import process"
else
    echo "📊 You should see:"
    echo "   • 5 unique patients instead of 20+ individual events"
    echo "   • Each patient grouped with their sessions"
    echo "   • Perfect for testing the new grouped import feature"
fi