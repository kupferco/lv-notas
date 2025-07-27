# Session Management Technical Documentation

## 🏗️ Architecture Overview

The LV Notas session management system implements bank-grade security with intelligent user experience. It consists of three main components working together:

### 1. **Backend Session Control** (Single Source of Truth)
- **Database**: PostgreSQL stores session timing and activity
- **API**: Express routes handle session validation and extension
- **JWT**: Secure token-based authentication

### 2. **Frontend Session Monitoring** (Adaptive Polling)
- **AuthContext**: Manages session state and warning triggers
- **ActivityMonitor**: Detects user interaction and extends sessions
- **SessionTimeoutModal**: Dynamic warning modal with countdown

### 3. **Configuration Management** (Database-Driven)
- **Database Defaults**: Column defaults set session timing
- **Shell Script**: Easy configuration tool for different environments
- **Live Updates**: Changes apply to new sessions immediately

## 🔧 Configuration Guide

### Quick Configuration
```bash
# Navigate to database tools
cd clinic-api/db

# Run configuration tool
./session-config.sh

# Choose your mode:
# 1. Rapid Testing (2min session, 1min warning)
# 2. Development (30min session, 2min warning)  
# 3. Production (1hr session, 5min warning)
# 4. Extended (2hr session, 10min warning)
# 5. Custom (your own timing)
```

### Advanced Configuration
```sql
-- Manual database configuration
ALTER TABLE user_sessions 
ALTER COLUMN inactive_timeout_minutes SET DEFAULT 60,
ALTER COLUMN warning_timeout_minutes SET DEFAULT 5;

-- Update existing active sessions (optional)
UPDATE user_sessions 
SET 
  inactive_timeout_minutes = 60,
  warning_timeout_minutes = 5
WHERE status = 'active';
```

### Environment-Specific Recommendations
- **Development**: 30-minute sessions (frequent testing, reasonable timeout)
- **Staging**: 1-hour sessions (realistic testing environment)
- **Production**: 1-hour sessions (standard business application timeout)
- **Demo/Training**: 2-minute sessions (quick demonstration of timeout functionality)

## 📡 API Endpoints

### Session Status (Read-Only)
```typescript
GET /api/auth/session-status
Authorization: Bearer <session_token>

Response:
{
  "status": "active",
  "timeUntilWarningMs": 45000,
  "timeUntilExpiryMs": 105000,
  "warningTimeoutMinutes": 1,
  "inactiveTimeoutMinutes": 2,
  "shouldShowWarning": false,
  "readOnly": true
}
```

### Session Extension
```typescript
POST /api/auth/extend-session
Content-Type: application/json

Body:
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "message": "Session extended successfully",
  "extendsFor": "1h"
}
```

### Session Configuration
```typescript
GET /api/auth/session-config

Response:
{
  "defaultInactiveTimeoutMinutes": 30,
  "defaultWarningTimeoutMinutes": 2,
  "activeSessionCount": 3,
  "currentSessionInactiveTimeout": 30,
  "currentSessionWarningTimeout": 2
}
```

## 🎨 Frontend Components

### AuthContext (Session Orchestrator)
```typescript
// Key responsibilities:
- Session monitoring with adaptive polling (90% rule)
- Warning trigger management
- Cross-tab session extension detection
- Clean session lifecycle management

// Adaptive polling strategy:
- Before warning: Check at 90% of time until warning
- During warning: Check every 5 seconds for precision
- Uses mathematical optimization for efficiency
```

### ActivityMonitor (User Interaction Detector)
```typescript
// Monitored events:
- click, keypress, touchstart (meaningful interactions)
- mousedown, scroll, mousemove (secondary interactions)

// Smart behavior:
- Pauses when warning modal is active
- Throttles API calls (max every 10 seconds)
- Stops completely on logout
- Automatic cleanup on component unmount
```

### SessionTimeoutModal (Warning Interface)
```typescript
// Dynamic features:
- Real-time countdown from backend
- Auto-dismiss on session extension
- Activity monitoring pause control
- Brazilian Portuguese messaging
- Progress bar with color coding
```

## 🗄️ Database Schema

### Core Session Tables
```sql
-- User sessions with configurable timing
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_credentials(id),
    session_token TEXT NOT NULL,
    
    -- Configurable timing (set via session-config.sh)
    inactive_timeout_minutes INTEGER DEFAULT 30,
    warning_timeout_minutes INTEGER DEFAULT 2,
    max_session_hours INTEGER DEFAULT 8,
    
    -- Session lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active',
    termination_reason VARCHAR(50),
    ip_address INET,
    user_agent TEXT
);

-- Activity logging for audit trail
CREATE TABLE session_activity_log (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(id),
    user_id INTEGER,
    activity_type VARCHAR(50), -- 'login', 'activity', 'logout', 'extend'
    endpoint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User credentials
CREATE TABLE user_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### Session Status Calculation
```sql
-- How session timing is calculated:
-- Session expires at: last_activity_at + inactive_timeout_minutes
-- Warning starts at: session_expires_at - warning_timeout_minutes
-- Current logic in /api/auth/session-status endpoint
```

## ⚡ Performance Optimization

### Adaptive Polling Strategy
```typescript
// Mathematical optimization for polling frequency:

if (timeUntilWarning > 0) {
  // Before warning: 90% rule
  nextCheckDelay = Math.floor(timeUntilWarning * 0.9);
} else {
  // During warning: 5-second precision
  nextCheckDelay = 5000;
}

// Examples:
// 60s until warning → check in 54s
// 10s until warning → check in 9s  
// Warning active → check every 5s
```

### Database Efficiency
```sql
-- Optimized session status query (read-only)
SELECT 
    last_activity_at, 
    inactive_timeout_minutes, 
    warning_timeout_minutes,
    status
FROM user_sessions 
WHERE id = $1 AND status = 'active';

-- No UPDATE queries in status checks
-- Activity updates only on actual user actions
```

### Memory Management
```typescript
// Proper cleanup patterns:
- useEffect cleanup functions
- clearTimeout/clearInterval on unmount
- useRef for current values (avoid stale closures)
- Explicit cleanup in AuthContext
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Session Timers Constantly Increasing
**Symptom**: Session start time increases every second
**Cause**: Backend updating `last_activity_at` on status checks
**Fix**: Ensure `/api/auth/session-status` is read-only (doesn't call `updateSessionActivity`)

#### 2. Warning Modal Doesn't Appear
**Symptom**: Session expires without warning
**Cause**: Session monitoring not active
**Fix**: Check `startSessionMonitoring()` is called after login and on page refresh

#### 3. Activity Monitor Doesn't Stop During Warning
**Symptom**: Mouse movement resets timer while modal is open
**Cause**: Activity monitor not paused
**Fix**: Ensure `SessionTimeoutModal` calls `activityMonitor.setWarningActive(true)` when visible

#### 4. Cross-Tab Extensions Not Detected
**Symptom**: One tab logs out despite extension in another tab
**Cause**: Session monitoring not detecting extensions quickly enough
**Fix**: Reduce polling interval during warning period (currently 5 seconds)

#### 5. React State Stale Closure Issues
**Symptom**: `showSessionWarning` always returns `false` in callbacks
**Cause**: State captured at function creation time
**Fix**: Use `useRef` to get current state values in async callbacks

### Debug Tools

#### Console Logging
```typescript
// Key logs to watch:
- "📊 AuthContext: Xs until warning, next check in Ys"
- "🚨 Session warning modal appeared - pausing activity monitoring"
- "✅ Session extended detected - dismissing warning modal"
- "🎯 Meaningful activity detected: click"
- "🚫 IGNORING mousemove - warning is active"
```

#### Database Inspection
```sql
-- Check current sessions
SELECT 
    id, user_id, status, 
    inactive_timeout_minutes,
    last_activity_at,
    created_at
FROM user_sessions 
WHERE status = 'active'
ORDER BY last_activity_at DESC;

-- Check session activity
SELECT * FROM session_activity_log 
WHERE session_id = YOUR_SESSION_ID
ORDER BY timestamp DESC
LIMIT 10;
```

#### Frontend State
```typescript
// Check AuthContext state:
console.log('Session monitoring active:', sessionMonitoringActive);
console.log('Show warning:', showSessionWarning);
console.log('Activity monitor status:', activityMonitor.getStatus());
```

## 🔒 Security Considerations

### Session Security
- **JWT Secret**: Use strong, unique JWT secret in production
- **Token Expiration**: Short-lived tokens (1 hour) with refresh capability
- **IP Validation**: Log IP addresses for session analysis
- **User Agent Tracking**: Detect session hijacking attempts

### Database Security
- **Password Hashing**: bcrypt with salt rounds 12+
- **SQL Injection**: Parameterized queries throughout
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Audit Trail**: Complete session activity logging

### Frontend Security
- **Token Storage**: localStorage with secure handling
- **HTTPS Only**: Enforce HTTPS in production
- **CORS**: Proper origin validation
- **XSS Protection**: Input sanitization and CSP headers

## 🚀 Deployment Checklist

### Database Migration
```bash
# 1. Create new tables (if not exists)
psql -d your_db -f clinic-api/db/session_schema.sql

# 2. Set production session timing
cd clinic-api/db
./session-config.sh
# Choose option 3 (Production: 1 hour)

# 3. Verify configuration
psql -d your_db -c "
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'user_sessions' 
AND column_name = 'inactive_timeout_minutes';
"
```

### Environment Variables
```bash
# Backend (.env)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production
POSTGRES_HOST=your-production-db
SAFE_PROXY_KEY=your-production-api-key

# Frontend (.env.production)
EXPO_PUBLIC_API_URL=https://your-api-domain.com
SAFE_PROXY_API_KEY=your-production-api-key
```

### Production Validation
```bash
# 1. Test session creation
curl -X POST https://your-api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Test session status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api/api/auth/session-status

# 3. Test session extension
curl -X POST https://your-api/api/auth/extend-session \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"YOUR_TOKEN"}'

# 4. Verify cleanup
# Check that expired sessions are marked properly
```

---

**This session management system provides enterprise-grade security with intelligent user experience. The mathematical optimization ensures minimal server load while maintaining responsive user interactions and fair timeout warnings.** 🔐⚡