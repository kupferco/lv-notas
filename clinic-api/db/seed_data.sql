-- clinic-api/db/seed_data.sql
-- Test data for LV Notas development environment
-- This creates realistic sample data for testing the onboarding and billing systems

-- Insert test therapists
INSERT INTO therapists (nome, email, telefone, google_calendar_id, billing_cycle, default_session_price, onboarding_completed) 
VALUES 
  ('Dra. Ana Silva', 'ana.silva@terapia.com', '11999999901', 'c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com', 'monthly', 150.00, true),
  ('Dr. Carlos Santos', 'carlos.santos@psicologia.com', '11999999902', NULL, 'weekly', 180.00, false),
  ('Dra. Maria Oliveira', 'maria.oliveira@clinica.com', '11999999903', NULL, 'per_session', 200.00, false);

-- Insert test patients with dual date system
INSERT INTO patients (nome, email, telefone, therapist_id, therapy_start_date, lv_notas_billing_start_date, session_price, recurring_pattern, notes) 
VALUES 
  -- Patients for Ana Silva (therapist_id = 1)
  ('João da Silva', 'joao.silva@email.com', '11888888801', 1, '2024-01-15', '2025-06-01', NULL, 'weekly', 'Paciente regular, sessões toda segunda às 14h'),
  ('Maria Santos', 'maria.santos@email.com', '11888888802', 1, '2024-03-10', '2025-06-01', 120.00, 'bi-weekly', 'Preço especial devido situação financeira'),
  ('Pedro Costa', 'pedro.costa@email.com', '11888888803', 1, '2023-11-20', '2025-06-01', NULL, 'weekly', 'Terapia de longa duração, muitos progressos'),
  
  -- Patients for Carlos Santos (therapist_id = 2) - not onboarded yet
  ('Ana Pereira', 'ana.pereira@email.com', '11888888804', 2, NULL, NULL, NULL, NULL, 'Paciente nova, aguardando onboarding'),
  ('Lucas Rodrigues', 'lucas.rodrigues@email.com', '11888888805', 2, NULL, NULL, NULL, NULL, 'Aguardando configuração inicial'),
  
  -- Patients for Maria Oliveira (therapist_id = 3)
  ('Carla Ferreira', 'carla.ferreira@email.com', '11888888806', 3, '2024-05-01', '2025-07-01', NULL, 'monthly', 'Sessões mensais de acompanhamento');

-- Insert test sessions with billing information
INSERT INTO sessions (date, patient_id, therapist_id, status, billable, session_price, billing_cycle_used, created_during_onboarding) 
VALUES 
  -- Sessions for João da Silva (patient_id = 1) - some before billing start, some after
  ('2025-05-15 14:00:00-03', 1, 1, 'compareceu', true, 150.00, 'monthly', false), -- Before billing start (not billable)
  ('2025-06-02 14:00:00-03', 1, 1, 'compareceu', true, 150.00, 'monthly', false), -- After billing start (billable)
  ('2025-06-09 14:00:00-03', 1, 1, 'compareceu', true, 150.00, 'monthly', false), -- Billable
  ('2025-06-16 14:00:00-03', 1, 1, 'agendada', true, 150.00, 'monthly', false),   -- Future session
  ('2025-06-23 14:00:00-03', 1, 1, 'agendada', true, 150.00, 'monthly', false),   -- Future session
  
  -- Sessions for Maria Santos (patient_id = 2) - bi-weekly with special price
  ('2025-06-03 10:00:00-03', 2, 1, 'compareceu', true, 120.00, 'monthly', false), -- Billable with special price
  ('2025-06-17 10:00:00-03', 2, 1, 'agendada', true, 120.00, 'monthly', false),   -- Future bi-weekly
  
  -- Sessions for Pedro Costa (patient_id = 3) - long-term patient
  ('2024-12-10 16:00:00-03', 3, 1, 'compareceu', true, 150.00, 'monthly', true),  -- Historical session (not billable - before billing start)
  ('2025-06-05 16:00:00-03', 3, 1, 'compareceu', true, 150.00, 'monthly', false), -- Billable
  ('2025-06-12 16:00:00-03', 3, 1, 'cancelada', false, 150.00, 'monthly', false), -- Cancelled (not billable)
  ('2025-06-19 16:00:00-03', 3, 1, 'agendada', true, 150.00, 'monthly', false),   -- Future session
  
  -- Sessions for Carla Ferreira (patient_id = 6) - monthly sessions, billing starts July
  ('2025-06-15 11:00:00-03', 6, 3, 'compareceu', true, 200.00, 'per_session', false), -- Before billing start (not billable)
  ('2025-07-15 11:00:00-03', 6, 3, 'agendada', true, 200.00, 'per_session', false);   -- Future billable session

-- Insert therapist onboarding progress
INSERT INTO therapist_onboarding (therapist_id, step, data, notes) 
VALUES 
  -- Ana Silva completed onboarding
  (1, 'calendar_selected', '{"calendar_id": "primary", "calendar_name": "Calendário Principal"}', 'Calendário selecionado com sucesso'),
  (1, 'events_imported', '{"events_count": 45, "therapy_sessions": 32, "import_batch_id": "batch_20250601_001"}', 'Importados 32 sessões de terapia de 45 eventos'),
  (1, 'patients_created', '{"patients_created": 3, "duplicates_merged": 1}', 'Criados 3 pacientes, 1 duplicata resolvida'),
  (1, 'appointments_linked', '{"linked_sessions": 28, "manual_links": 4}', 'Sessões vinculadas aos pacientes'),
  (1, 'dual_dates_configured', '{"billing_start_date": "2025-06-01"}', 'Data de início do faturamento LV Notas configurada'),
  (1, 'billing_configured', '{"billing_cycle": "monthly", "default_price": 150.00}', 'Faturamento mensal configurado'),
  (1, 'completed', '{"completion_date": "2025-06-01"}', 'Onboarding concluído com sucesso'),
  
  -- Carlos Santos started but not completed
  (2, 'calendar_selected', '{"calendar_id": "primary", "calendar_name": "Calendário Principal"}', 'Calendário selecionado'),
  (2, 'events_imported', '{"events_count": 23, "therapy_sessions": 18, "import_batch_id": "batch_20250620_001"}', 'Eventos importados aguardando processamento');

-- Insert sample imported calendar events for Carlos Santos (onboarding in progress)
INSERT INTO imported_calendar_events (therapist_id, google_event_id, original_summary, start_time, end_time, is_therapy_session, matched_patient_name, import_batch_id, attendees_emails)
VALUES 
  (2, 'event_001_carlos', 'Sessão - Ana Pereira', '2025-06-20 09:00:00-03', '2025-06-20 10:00:00-03', true, 'Ana Pereira', 'batch_20250620_001', '{"ana.pereira@email.com"}'),
  (2, 'event_002_carlos', 'Sessão - Lucas Rodrigues', '2025-06-20 14:00:00-03', '2025-06-20 15:00:00-03', true, 'Lucas Rodrigues', 'batch_20250620_001', '{"lucas.rodrigues@email.com"}'),
  (2, 'event_003_carlos', 'Reunião Administrativa', '2025-06-21 10:00:00-03', '2025-06-21 11:00:00-03', false, NULL, 'batch_20250620_001', '{}'),
  (2, 'event_004_carlos', 'Sessão - Ana Pereira', '2025-06-27 09:00:00-03', '2025-06-27 10:00:00-03', true, 'Ana Pereira', 'batch_20250620_001', '{"ana.pereira@email.com"}');

-- Insert patient matching candidates for Carlos Santos
INSERT INTO patient_matching_candidates (therapist_id, import_batch_id, extracted_name, email_addresses, event_count, first_session_date, latest_session_date, suggested_therapy_start_date, suggested_billing_start_date, confidence_score)
VALUES 
  (2, 'batch_20250620_001', 'Ana Pereira', '{"ana.pereira@email.com"}', 2, '2025-06-20', '2025-06-27', '2025-06-20', '2025-07-01', 0.95),
  (2, 'batch_20250620_001', 'Lucas Rodrigues', '{"lucas.rodrigues@email.com"}', 1, '2025-06-20', '2025-06-20', '2025-06-20', '2025-07-01', 0.90);

-- Insert recurring session templates
INSERT INTO recurring_session_templates (therapist_id, patient_id, day_of_week, start_time, frequency, effective_from, created_from_import, import_batch_id)
VALUES 
  -- João da Silva - Mondays at 14:00 (weekly)
  (1, 1, 1, '14:00:00', 'weekly', '2025-06-01', false, NULL),
  -- Maria Santos - Tuesdays at 10:00 (bi-weekly)  
  (1, 2, 2, '10:00:00', 'bi-weekly', '2025-06-01', false, NULL),
  -- Pedro Costa - Thursdays at 16:00 (weekly)
  (1, 3, 4, '16:00:00', 'weekly', '2025-06-01', false, NULL),
  -- Carla Ferreira - Monthly sessions (15th of each month at 11:00)
  (3, 6, 1, '11:00:00', 'monthly', '2025-07-01', false, NULL);

-- Insert billing history - showing how Ana Silva's pricing evolved
INSERT INTO therapist_billing_history (therapist_id, billing_cycle, default_session_price, effective_from_date, reason_for_change, created_by, notes)
VALUES 
  (1, 'weekly', 120.00, '2024-01-01', 'Configuração inicial da prática', 'system', 'Configuração inicial quando começou a usar LV Notas'),
  (1, 'monthly', 150.00, '2025-06-01', 'Mudança para faturamento mensal com aumento de preço', 'ana.silva@terapia.com', 'Pacientes preferiram faturamento mensal, ajuste de preço para inflação'),
  (2, 'weekly', 180.00, '2025-06-20', 'Configuração inicial durante onboarding', 'system', 'Configuração inicial durante processo de onboarding'),
  (3, 'per_session', 200.00, '2025-01-01', 'Configuração inicial - preferência por cobrança por sessão', 'system', 'Terapeuta prefere cobrança individual por sessão');

-- Insert patient billing history - showing Maria Santos' special pricing
INSERT INTO patient_billing_history (patient_id, therapist_id, billing_cycle, session_price, effective_from_date, reason_for_change, created_by, notes)
VALUES 
  (2, 1, 'monthly', 120.00, '2025-06-01', 'Preço especial devido situação financeira', 'ana.silva@terapia.com', 'Paciente solicitou desconto devido dificuldades financeiras temporárias');

-- Insert sample billing periods
INSERT INTO billing_periods (therapist_id, patient_id, billing_cycle, period_start_date, period_end_date, total_sessions, billable_sessions, total_amount, invoice_generated)
VALUES 
  -- Ana Silva - João da Silva - June 2025
  (1, 1, 'monthly', '2025-06-01', '2025-06-30', 4, 2, 300.00, false),
  -- Ana Silva - Maria Santos - June 2025  
  (1, 2, 'monthly', '2025-06-01', '2025-06-30', 1, 1, 120.00, false),
  -- Ana Silva - Pedro Costa - June 2025
  (1, 3, 'monthly', '2025-06-01', '2025-06-30', 3, 1, 150.00, false);

-- Insert sample check-ins
INSERT INTO check_ins (patient_id, session_id, session_date, created_by, status)
VALUES 
  (1, 2, '2025-06-02 14:00:00-03', 'system', 'compareceu'),
  (1, 3, '2025-06-09 14:00:00-03', 'system', 'compareceu'),
  (2, 6, '2025-06-03 10:00:00-03', 'system', 'compareceu'),
  (3, 9, '2025-06-05 16:00:00-03', 'system', 'compareceu'),
  (6, 13, '2025-06-15 11:00:00-03', 'system', 'compareceu');

-- Insert sample calendar webhooks (for existing system)
INSERT INTO calendar_webhooks (channel_id, resource_id, expiration)
VALUES 
  ('lv-calendar-webhook-1719456000', 'resource_id_ana_silva', '2025-07-27 12:00:00-03');

-- Add some sample calendar events
INSERT INTO calendar_events (event_type, google_event_id, session_date, email)
VALUES 
  ('new', 'cal_event_001', '2025-06-02 14:00:00-03', 'joao.silva@email.com'),
  ('new', 'cal_event_002', '2025-06-09 14:00:00-03', 'joao.silva@email.com'),
  ('new', 'cal_event_003', '2025-06-03 10:00:00-03', 'maria.santos@email.com'),
  ('update', 'cal_event_004', '2025-06-19 16:00:00-03', 'pedro.costa@email.com'),
  ('cancel', 'cal_event_005', '2025-06-12 16:00:00-03', 'pedro.costa@email.com');

-- Update therapist onboarding completion timestamps
UPDATE therapists 
SET 
  onboarding_started_at = '2025-06-01 09:00:00-03',
  onboarding_completed_at = '2025-06-01 17:30:00-03'
WHERE id = 1;

UPDATE therapists 
SET onboarding_started_at = '2025-06-20 10:00:00-03'
WHERE id = 2;