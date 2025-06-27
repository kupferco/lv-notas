-- Insert famous therapists
INSERT INTO therapists (nome, email, telefone, google_calendar_id) 
VALUES 
  ('Dr. Sigmund Freud', 'freud@vienna.com', '11999999901', c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com),
  ('Dr. Carl Jung', 'jung@zurich.com', '11999999902', NULL),
  ('Dr. Jacques Lacan', 'lacan@paris.com', '11999999903', NULL),
  ('Dr. Melanie Klein', 'klein@london.com', '11999999904', NULL),
  ('Dr. Donald Winnicott', 'winnicott@london.com', '11999999905', NULL);

-- Insert famous patients
INSERT INTO patients (nome, email, telefone, nota, preco) 
VALUES 
  ('Salvador Dalí', 'melting.clocks@art.com', '11888888801', true, 300.00),
  ('Vincent van Gogh', 'starry.night@art.com', '11888888802', true, 250.00),
  ('Virginia Woolf', 'mrs.dalloway@writer.com', '11888888803', false, 200.00),
  ('Friedrich Nietzsche', 'beyond.good@philosophy.com', '11888888804', true, 350.00),
  ('Sylvia Plath', 'bell.jar@poetry.com', '11888888805', false, 280.00);
