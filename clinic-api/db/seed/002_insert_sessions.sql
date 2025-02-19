-- Insert sessions
INSERT INTO sessions (date, patient_id, therapist_id, status) 
VALUES 
  -- Freud with Dali (exploring surrealism and dreams)
  (CURRENT_DATE - INTERVAL '2 months', 6, 1, 'compareceu'),
  (CURRENT_DATE - INTERVAL '1 month', 6, 1, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 week', 6, 1, 'agendada'),

  -- Jung with Van Gogh (exploring spirituality and symbols)
  (CURRENT_DATE - INTERVAL '3 months', 7, 2, 'compareceu'),
  (CURRENT_DATE - INTERVAL '2 months', 7, 2, 'cancelada'),
  (CURRENT_DATE + INTERVAL '2 weeks', 7, 2, 'agendada'),

  -- Lacan with Virginia Woolf (exploring language and identity)
  (CURRENT_DATE - INTERVAL '1 month', 8, 3, 'compareceu'),
  (CURRENT_DATE + INTERVAL '3 days', 8, 3, 'agendada'),
  (CURRENT_DATE + INTERVAL '3 weeks', 8, 3, 'agendada')
  
  -- Klein with Nietzsche (exploring early life experiences)
  (CURRENT_DATE - INTERVAL '15 days', 9, 4, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 month', 9, 4, 'agendada')
  
  -- Winnicott with Sylvia Plath (exploring transitional spaces and creativity)
  (CURRENT_DATE - INTERVAL '7 days', 10, 5, 'compareceu'),
  (CURRENT_DATE + INTERVAL '1 week', 10, 5, 'agendada'),
  (CURRENT_DATE + INTERVAL '2 months', 10, 5, 'agendada');