-- Insert one test therapist for development
INSERT INTO therapists (nome, email, telefone, google_calendar_id) 
VALUES 
  ('Dr. Test Therapist', 'test@example.com', '11999999901', 'c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com');

-- Insert one test patient linked to the therapist
INSERT INTO patients (nome, email, telefone, therapist_id) 
VALUES 
  ('Vincent van Gogh', 'starry.night@art.com', '11888888802', 1);
