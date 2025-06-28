-- clinic-api/db/seed/02_patients_seed.sql
-- Create 20 diverse patients for dnkupfer@gmail.com

INSERT INTO patients (nome, email, telefone, nota, preco, therapist_id, lv_notas_billing_start_date, created_at) VALUES

-- Premium patients (R$ 200-250) - Early adopters
('Maria Silva Santos', 'maria.silva@email.com', '+5511987001001', false, 250.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2024-12-15 09:00:00-03'),
('João Pedro Oliveira', 'joao.oliveira@gmail.com', '+5511987001002', false, 220.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2024-12-20 10:30:00-03'),
('Ana Carolina Ferreira', 'ana.ferreira@outlook.com', '+5511987001003', true, 200.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-01-05 14:00:00-03'),

-- Standard patients (R$ 150-180) - Main group
('Carlos Eduardo Lima', 'carlos.lima@email.com', '+5511987001004', false, 180.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-01-10 11:00:00-03'),
('Fernanda Costa Rodrigues', 'fernanda.costa@gmail.com', '+5511987001005', false, 160.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-01-15 16:00:00-03'),
('Rafael Santos Almeida', 'rafael.almeida@email.com', '+5511987001006', true, 170.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-01-20 13:30:00-03'),
('Juliana Pereira Silva', 'juliana.pereira@outlook.com', '+5511987001007', false, 150.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-01-25 15:00:00-03'),
('Lucas Martins Souza', 'lucas.martins@gmail.com', '+5511987001008', false, 180.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-01-01', '2025-02-01 10:00:00-03'),

-- Medium group (R$ 140-170) - Later starters
('Camila Barbosa Santos', 'camila.barbosa@email.com', '+5511987001009', true, 160.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-02-01', '2025-02-05 14:30:00-03'),
('Gabriel Henrique Costa', 'gabriel.costa@gmail.com', '+5511987001010', false, 170.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-02-01', '2025-02-10 11:30:00-03'),
('Bruna Oliveira Lima', 'bruna.oliveira@email.com', '+5511987001011', false, 140.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-02-01', '2025-02-15 09:30:00-03'),
('Thiago Rodrigues Silva', 'thiago.rodrigues@outlook.com', '+5511987001012', true, 130.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-02-01', '2025-02-20 16:30:00-03'),

-- Budget patients (R$ 120-140) - March starters
('Amanda Santos Ferreira', 'amanda.santos@gmail.com', '+5511987001013', false, 120.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-03-01', '2025-03-01 08:30:00-03'),
('Pedro Henrique Alves', 'pedro.alves@email.com', '+5511987001014', false, 140.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-03-01', '2025-03-05 17:00:00-03'),
('Larissa Costa Martins', 'larissa.martins@outlook.com', '+5511987001015', true, 130.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-03-01', '2025-03-10 12:00:00-03'),

-- Recent patients (R$ 160-200) - Spring/Summer 2025
('Diego Santos Lima', 'diego.lima@gmail.com', '+5511987001016', false, 190.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-04-01', '2025-04-01 13:00:00-03'),
('Natália Ferreira Costa', 'natalia.ferreira@email.com', '+5511987001017', false, 160.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-04-15', '2025-04-15 15:30:00-03'),
('Henrique Oliveira Santos', 'henrique.santos@outlook.com', '+5511987001018', true, 180.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-05-01', '2025-05-01 10:30:00-03'),
('Beatriz Lima Rodrigues', 'beatriz.lima@gmail.com', '+5511987001019', false, 170.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-05-15', '2025-05-15 14:00:00-03'),
('Mateus Costa Almeida', 'mateus.almeida@email.com', '+5511987001020', false, 200.00, 
 (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com'), '2025-06-01', '2025-06-01 16:00:00-03');

-- Show patient summary
SELECT 
    'Patients created successfully!' as status,
    COUNT(*) as total_patients,
    MIN(preco) as min_price,
    MAX(preco) as max_price,
    AVG(preco)::DECIMAL(10,2) as avg_price
FROM patients 
WHERE therapist_id = (SELECT id FROM therapists WHERE email = 'dnkupfer@gmail.com');