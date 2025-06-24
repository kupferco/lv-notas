-- Production seed data for clinic_db
-- Running this script requires admin privileges

-- First, check if therapist exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM therapists WHERE email = 'daniel@kupfer.co') THEN
        INSERT INTO therapists (nome, email, telefone, google_calendar_id) 
        VALUES 
            ('Dr. Sigmund Freud', 'freud@vienna.com', '11999999901', 'c_1bf25d56063c4f0462b9d0ddb77c3bc46ddfb41d7df67a541852782e7ffea3a0@group.calendar.google.com'),
            ('Dr. Carl Jung', 'jung@zurich.com', '11999999902', NULL),
            ('Dr. Jacques Lacan', 'lacan@paris.com', '11999999903', NULL),
            ('Dr. Melanie Klein', 'klein@london.com', '11999999904', NULL),
            ('Dr. Donald Winnicott', 'winnicott@london.com', '11999999905', NULL);
    END IF;
END
$$;

-- Add more production seed data as needed

