-- clinic-api/db/schemas/02_sessions_calendar.sql
-- Session management and calendar integration tables

-- =============================================================================
-- SESSIONS AND CALENDAR TABLES
-- =============================================================================

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_webhooks CASCADE;

-- Sessions with enhanced billing tracking
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    google_calendar_event_id VARCHAR(255),
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER REFERENCES therapists(id) ON DELETE CASCADE,
    status session_status DEFAULT 'agendada',
    -- Billing fields
    billable BOOLEAN DEFAULT true, -- Whether this session counts for billing
    billing_period VARCHAR(20), -- Which billing period this belongs to
    session_price DECIMAL(10,2), -- Price for this specific session
    billing_cycle_used VARCHAR(20), -- What cycle was active when this session occurred
    -- Onboarding fields
    created_during_onboarding BOOLEAN DEFAULT false, -- Was this session created during import?
    import_batch_id VARCHAR(255), -- Reference to import batch
    -- Payment tracking fields
    payment_requested BOOLEAN DEFAULT false,
    payment_request_date TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(50) DEFAULT 'pending',
    paid_date TIMESTAMP WITH TIME ZONE,
    billing_period_id INTEGER, -- Will be added as FK later in billing schema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calendar events (existing functionality)
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    event_type event_type NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    email VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins (existing functionality)
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) DEFAULT 'compareceu'
);

-- Calendar webhooks (existing functionality)
CREATE TABLE calendar_webhooks (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    expiration TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id)
);

-- =============================================================================
-- INDEXES FOR SESSIONS AND CALENDAR
-- =============================================================================

CREATE INDEX idx_sessions_therapist_id ON sessions(therapist_id);
CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_billable ON sessions(therapist_id, billable, date);
CREATE INDEX idx_sessions_billing_period ON sessions(therapist_id, billing_period);
CREATE INDEX idx_sessions_payment_status ON sessions(therapist_id, payment_status);
CREATE INDEX idx_sessions_payment_requested ON sessions(therapist_id, payment_requested, payment_request_date);

-- =============================================================================
-- COMMENTS FOR SESSIONS AND CALENDAR
-- =============================================================================

COMMENT ON COLUMN sessions.billable IS 'Whether this session counts toward billing (based on billing start date)';
COMMENT ON COLUMN sessions.created_during_onboarding IS 'Was this session created during the onboarding import process';
COMMENT ON COLUMN sessions.payment_status IS 'Current payment status: pending, paid, overdue, etc.';
COMMENT ON TABLE sessions IS 'Therapy sessions with billing and payment tracking';
COMMENT ON TABLE calendar_events IS 'Log of calendar events for sync tracking';
COMMENT ON TABLE check_ins IS 'Patient attendance records';
COMMENT ON TABLE calendar_webhooks IS 'Active Google Calendar webhook subscriptions';

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Sessions and calendar tables created successfully!';
END $$;