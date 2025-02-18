-- Insert sessions
INSERT INTO sessions (date, patient_id, therapist_id, status) 
VALUES 
  -- Freud with Dali (exploring surrealism and dreams)
  (CURRENT_DATE - INTERVAL '2 months', 1, 1, 'compareceu'),
  (CURRENT_DATE - INTERVAL '1 month', 1, 1, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 week', 1, 1, 'agendada'),

  -- Jung with Van Gogh (exploring spirituality and symbols)
  (CURRENT_DATE - INTERVAL '3 months', 2, 2, 'compareceu'),
  (CURRENT_DATE - INTERVAL '2 months', 2, 2, 'cancelada'),
  (CURRENT_DATE + INTERVAL '2 weeks', 2, 2, 'agendada'),

  -- Lacan with Virginia Woolf (exploring language and identity)
  (CURRENT_DATE - INTERVAL '1 month', 3, 3, 'compareceu'),
  (CURRENT_DATE + INTERVAL '3 days', 3, 3, 'agendada'),
  (CURRENT_DATE + INTERVAL '3 weeks', 3, 3, 'agendada'),

  -- Klein with Nietzsche (exploring early life experiences)
  (CURRENT_DATE - INTERVAL '15 days', 4, 4, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 month', 4, 4, 'agendada'),

  -- Winnicott with Sylvia Plath (exploring transitional spaces and creativity)
  (CURRENT_DATE - INTERVAL '7 days', 5, 5, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 week', 5, 5, 'agendada'),
  (CURRENT_DATE + INTERVAL '2 months', 5, 5, 'agendada');
