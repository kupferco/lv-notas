-- clinic-api/db/schemas/09_seed_data.sql
-- Default data and test data for development

-- =============================================================================
-- DEFAULT THERAPIST DATA (FOR DEVELOPMENT)
-- =============================================================================

-- Insert default therapist (only if none exists)
INSERT INTO therapists (
    nome,
    email,
    telefone,
    google_calendar_id,
    billing_cycle,
    default_session_price,
    onboarding_completed,
    onboarding_started_at,
    onboarding_completed_at
) 
SELECT 
    'Dr. Exemplo Terapeuta',
    'terapeuta@example.com',
    '(11) 99999-9999',
    'example_calendar_id',
    'monthly',
    15000, -- R$ 150.00 in cents
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM therapists WHERE email = 'terapeuta@example.com');

-- Get the therapist ID for seeding related data
DO $$
DECLARE
    therapist_id_var INTEGER;
BEGIN
    -- Get the therapist ID
    SELECT id INTO therapist_id_var FROM therapists WHERE email = 'terapeuta@example.com';
    
    -- Only seed if we have a therapist and no patients exist
    IF therapist_id_var IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patients WHERE therapist_id = therapist_id_var) THEN
        
        -- Insert sample patients
        INSERT INTO patients (
            nome,
            email,
            telefone,
            preco,
            therapist_id,
            therapy_start_date,
            lv_notas_billing_start_date,
            session_price,
            recurring_pattern,
            notes
        ) VALUES 
        (
            'Ana Silva',
            'ana.silva@email.com',
            '(11) 98765-4321',
            15000, -- R$ 150.00
            therapist_id_var,
            '2024-01-15', -- Started therapy in January
            CURRENT_DATE - INTERVAL '30 days', -- Billing started 30 days ago
            15000,
            'weekly',
            'Paciente regular, sessões às terças-feiras às 14h'
        ),
        (
            'Carlos Oliveira',
            'carlos.oliveira@email.com',
            '(11) 97654-3210',
            18000, -- R$ 180.00
            therapist_id_var,
            '2024-02-01',
            CURRENT_DATE - INTERVAL '20 days', -- Billing started 20 days ago
            18000,
            'weekly',
            'Sessões às quintas-feiras às 16h'
        ),
        (
            'Maria Santos',
            'maria.santos@email.com',
            '(11) 96543-2109',
            16000, -- R$ 160.00
            therapist_id_var,
            '2024-03-01',
            CURRENT_DATE - INTERVAL '10 days', -- Recent billing start
            16000,
            'bi-weekly',
            'Sessões quinzenais, flexibilidade de horário'
        );
        
        RAISE NOTICE 'Sample patients created for development';
        
        -- Insert sample sessions for the last 30 days (Ana Silva - Tuesdays)
        INSERT INTO sessions (
            date,
            patient_id,
            therapist_id,
            status,
            billable,
            session_price,
            payment_status,
            payment_requested
        )
        SELECT 
            date_val + INTERVAL '14 hours', -- 2 PM sessions
            p.id,
            therapist_id_var,
            CASE 
                WHEN random() < 0.9 THEN 'compareceu'::session_status
                WHEN random() < 0.95 THEN 'agendada'::session_status
                ELSE 'cancelada'::session_status
            END,
            true,
            p.session_price,
            CASE 
                WHEN random() < 0.7 THEN 'paid'
                WHEN random() < 0.85 THEN 'pending'
                ELSE 'overdue'
            END,
            random() < 0.8 -- 80% chance payment was requested
        FROM patients p
        CROSS JOIN (
            SELECT (CURRENT_DATE - INTERVAL '1 day' * generate_series(1, 30))::timestamp as date_val
        ) dates
        WHERE p.therapist_id = therapist_id_var
        AND p.nome = 'Ana Silva' -- Only Ana for Tuesdays
        AND dates.date_val::date >= p.lv_notas_billing_start_date
        AND EXTRACT(DOW FROM dates.date_val) = 2; -- Tuesdays only
        
        -- Insert sample sessions for Carlos (Thursdays)
        INSERT INTO sessions (
            date,
            patient_id,
            therapist_id,
            status,
            billable,
            session_price,
            payment_status,
            payment_requested
        )
        SELECT 
            date_val + INTERVAL '16 hours', -- 4 PM sessions
            p.id,
            therapist_id_var,
            CASE 
                WHEN random() < 0.9 THEN 'compareceu'::session_status
                WHEN random() < 0.95 THEN 'agendada'::session_status
                ELSE 'cancelada'::session_status
            END,
            true,
            p.session_price,
            CASE 
                WHEN random() < 0.7 THEN 'paid'
                WHEN random() < 0.85 THEN 'pending'
                ELSE 'overdue'
            END,
            random() < 0.8 -- 80% chance payment was requested
        FROM patients p
        CROSS JOIN (
            SELECT (CURRENT_DATE - INTERVAL '1 day' * generate_series(1, 30))::timestamp as date_val
        ) dates
        WHERE p.therapist_id = therapist_id_var
        AND p.nome = 'Carlos Oliveira' -- Only Carlos for Thursdays
        AND dates.date_val::date >= p.lv_notas_billing_start_date
        AND EXTRACT(DOW FROM dates.date_val) = 4; -- Thursdays only
        
        -- Insert bi-weekly sessions for Maria
        INSERT INTO sessions (
            date,
            patient_id,
            therapist_id,
            status,
            billable,
            session_price,
            payment_status,
            payment_requested
        )
        SELECT 
            date_val + INTERVAL '10 hours', -- 10 AM sessions
            p.id,
            therapist_id_var,
            'compareceu'::session_status,
            true,
            p.session_price,
            CASE 
                WHEN random() < 0.6 THEN 'paid'
                ELSE 'pending'
            END,
            true
        FROM patients p
        CROSS JOIN (
            SELECT (CURRENT_DATE - INTERVAL '1 day' * (generate_series(1, 15) * 2))::timestamp as date_val
        ) dates
        WHERE p.therapist_id = therapist_id_var
        AND p.nome = 'Maria Santos'
        AND dates.date_val::date >= p.lv_notas_billing_start_date;
        
        RAISE NOTICE 'Sample sessions created for development';
        
    END IF;
END $$;

-- =============================================================================
-- DEFAULT SETTINGS FOR ALL THERAPISTS
-- =============================================================================

-- Ensure all therapists have default settings
INSERT INTO therapist_settings (therapist_id, setting_key, setting_value)
SELECT 
    t.id,
    setting_key,
    setting_value
FROM therapists t
CROSS JOIN (
    VALUES 
        ('payment_mode', 'simple'),
        ('view_mode', 'card'),
        ('auto_check_in_mode', 'false'),
        ('theme', 'light'),
        ('language', 'pt-BR'),
        ('notifications_enabled', 'true'),
        ('default_session_duration', '60'),
        ('currency_format', 'BRL')
) AS default_settings(setting_key, setting_value)
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_settings ts 
    WHERE ts.therapist_id = t.id 
    AND ts.setting_key = default_settings.setting_key
);

-- =============================================================================
-- SAMPLE ONBOARDING DATA (FOR TESTING)
-- =============================================================================

-- Mark the example therapist as having completed onboarding
INSERT INTO therapist_onboarding (therapist_id, step, completed_at, data, notes)
SELECT 
    t.id,
    step_data.step,
    CURRENT_TIMESTAMP - INTERVAL '1 day' * step_data.days_ago,
    step_data.data::jsonb,
    step_data.notes
FROM therapists t
CROSS JOIN (
    VALUES 
        ('calendar_selected', 5, '{"calendar_id": "example_calendar_id", "calendar_name": "Terapia - Dr. Exemplo"}', 'Google Calendar conectado com sucesso'),
        ('events_imported', 4, '{"events_count": 120, "date_range": "last_3_months"}', 'Importados 120 eventos dos últimos 3 meses'),
        ('patients_created', 3, '{"patients_count": 3, "matched_automatically": 3}', 'Pacientes criados automaticamente'),
        ('appointments_linked', 2, '{"sessions_created": 85, "success_rate": 0.95}', 'Sessões vinculadas com 95% de sucesso'),
        ('billing_configured', 1, '{"billing_cycle": "monthly", "default_price": 150.00}', 'Configuração de cobrança mensal'),
        ('completed', 0, '{"completion_date": "2024-07-01"}', 'Onboarding concluído com sucesso')
) AS step_data(step, days_ago, data, notes)
WHERE t.email = 'terapeuta@example.com'
AND NOT EXISTS (
    SELECT 1 FROM therapist_onboarding tog 
    WHERE tog.therapist_id = t.id AND tog.step = step_data.step
);

-- =============================================================================
-- SAMPLE PAYMENT DATA (FOR TESTING)
-- =============================================================================

-- Insert some payment transactions for paid sessions
INSERT INTO payment_transactions (
    session_id,
    patient_id,
    therapist_id,
    amount,
    payment_method,
    payment_date,
    reference_number,
    notes,
    created_by
)
SELECT 
    s.id,
    s.patient_id,
    s.therapist_id,
    s.session_price,
    CASE 
        WHEN random() < 0.6 THEN 'pix'
        WHEN random() < 0.8 THEN 'bank_transfer'
        WHEN random() < 0.95 THEN 'cash'
        ELSE 'credit_card'
    END,
    s.date + INTERVAL '1 day', -- Payment typically comes 1 day after session
    'REF-' || LPAD((random() * 999999)::integer::text, 6, '0'),
    'Pagamento automático de teste',
    'system'
FROM sessions s
JOIN therapists t ON s.therapist_id = t.id
WHERE t.email = 'terapeuta@example.com'
AND s.payment_status = 'paid'
AND s.status = 'compareceu'
AND NOT EXISTS (
    SELECT 1 FROM payment_transactions pt WHERE pt.session_id = s.id
)
LIMIT 20; -- Only create transactions for 20 sessions

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ 
DECLARE
    therapist_count INTEGER;
    patient_count INTEGER;
    session_count INTEGER;
    setting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO therapist_count FROM therapists;
    SELECT COUNT(*) INTO patient_count FROM patients;
    SELECT COUNT(*) INTO session_count FROM sessions;
    SELECT COUNT(*) INTO setting_count FROM therapist_settings;
    
    RAISE NOTICE '🎉 Seed data completed successfully!';
    RAISE NOTICE '👥 Therapists: %', therapist_count;
    RAISE NOTICE '🏥 Patients: %', patient_count;
    RAISE NOTICE '📅 Sessions: %', session_count;
    RAISE NOTICE '⚙️ Settings: %', setting_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready for development and testing!';
END $$;