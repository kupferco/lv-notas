
CREATE TYPE session_status AS ENUM ('agendada', 'compareceu', 'cancelada');
CREATE TYPE event_type AS ENUM ('new', 'update', 'cancel');

CREATE TABLE therapists (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    nota BOOLEAN DEFAULT false,
    preco DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    event_type event_type NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    email VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    google_calendar_event_id VARCHAR(255),
    patient_id INTEGER REFERENCES patients(id),
    therapist_id INTEGER REFERENCES therapists(id),
    status session_status DEFAULT 'agendada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    session_id INTEGER REFERENCES sessions(id),
    session_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) DEFAULT 'compareceu'
);
