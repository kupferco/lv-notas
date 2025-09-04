// clinic-api/src/routes/patients.ts
import express, { Router, Request, Response, NextFunction } from "express";
import pool from "../config/database.js";
import {
  Patient,
  BulkPatientCreateRequest,
  BillingCycleChangeRequest,
  BillingCycle,
  isBillingCycle
} from "../types/index.js";

const router: Router = Router();

const asyncHandler = (
  handler: (
    req: Request,
    res: Response
  ) => Promise<Response | void>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// ============================================================================
// EXISTING ENDPOINTS (ENHANCED WITH ALL NEW FIELDS)
// ============================================================================

// GET /api/patients?therapistEmail=email - Filter patients by therapist (ENHANCED with all fields)
router.get("/", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }

  // Include ALL patient fields including new address and personal info fields
  const result = await pool.query(
    `SELECT 
     p.id, 
     p.nome as name, 
     p.email, 
     p.telefone,
     p.cpf,
     CAST(p.preco AS INTEGER) as "sessionPrice",
     p.therapy_start_date as "therapyStartDate",
     p.lv_notas_billing_start_date as "lvNotasBillingStartDate",
     p.notes as observacoes,
     -- Address fields
     p.endereco_rua as "enderecoRua",
     p.endereco_numero as "enderecoNumero", 
     p.endereco_bairro as "enderecoBairro",
     p.endereco_codigo_municipio as "enderecoCodigoMunicipio",
     p.endereco_uf as "enderecoUf",
     p.endereco_cep as "enderecoCep",
     -- Personal info fields
     p.data_nascimento as "dataNascimento",
     p.genero,
     p.contato_emergencia_nome as "contatoEmergenciaNome",
     p.contato_emergencia_telefone as "contatoEmergenciaTelefone"
   FROM patients p 
   INNER JOIN therapists t ON p.therapist_id = t.id 
   WHERE t.email = $1 
   ORDER BY p.nome ASC`,
    [therapistEmail]
  );

  return res.json(result.rows);
}));

// POST /api/patients - Create new patient (ENHANCED with all new fields)
router.post("/", asyncHandler(async (req, res) => {
  const {
    nome,
    email,
    telefone,
    cpf,
    therapistEmail,
    sessionPrice,
    therapyStartDate,
    lvNotasBillingStartDate,
    observacoes,
    // Address fields
    enderecoRua,
    enderecoNumero,
    enderecoBairro,
    enderecoCodigoMunicipio,
    enderecoUf,
    enderecoCep,
    // Personal info fields
    dataNascimento,
    genero,
    contatoEmergenciaNome,
    contatoEmergenciaTelefone
  } = req.body;

  console.log("=== CREATE PATIENT REQUEST ===");
  console.log("Request body:", req.body);

  if (!nome || !email || !therapistEmail) {
    const missingFields = [];
    if (!nome) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!therapistEmail) missingFields.push('therapistEmail');

    console.log("Missing required fields:", missingFields);
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
      receivedData: { nome, email, telefone, cpf, therapistEmail }
    });
  }

  // CPF validation if provided
  if (cpf && cpf.trim()) {
    const cleanCpf = cpf.replace(/\D/g, '');

    // Basic CPF format validation (11 digits)
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: "CPF deve ter 11 dígitos",
        receivedCpf: cpf
      });
    }

    // Check for common invalid CPFs (all same digits)
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return res.status(400).json({
        error: "CPF inválido - não pode ter todos os dígitos iguais",
        receivedCpf: cpf
      });
    }
  }

  // CEP validation if provided
  if (enderecoCep && enderecoCep.trim()) {
    const cleanCep = enderecoCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return res.status(400).json({
        error: "CEP deve ter 8 dígitos",
        receivedCep: enderecoCep
      });
    }
  }

  try {
    // Get therapist ID
    console.log("Looking for therapist with email:", therapistEmail);
    const therapistResult = await pool.query(
      "SELECT id, nome, email FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    console.log("Therapist query result:", therapistResult.rows);

    if (therapistResult.rows.length === 0) {
      console.log("Therapist not found");

      // Get a list of available therapist emails for debugging
      const allTherapists = await pool.query("SELECT email FROM therapists ORDER BY id DESC LIMIT 5");

      return res.status(404).json({
        error: `No therapist found with email: ${therapistEmail}`,
        attemptedEmail: therapistEmail,
        availableEmails: allTherapists.rows.map(t => t.email),
        suggestion: "Check if the therapist email is correct or if the therapist exists in the database"
      });
    }

    const therapistId = therapistResult.rows[0].id;
    console.log("Found therapist:", therapistResult.rows[0]);

    // Check for duplicate CPF if provided
    if (cpf && cpf.trim()) {
      const formattedCpf = formatCpfForStorage(cpf);
      const cpfCheckResult = await pool.query(
        "SELECT id, nome FROM patients WHERE cpf = $1 AND therapist_id = $2",
        [formattedCpf, therapistId]
      );

      if (cpfCheckResult.rows.length > 0) {
        return res.status(400).json({
          error: "CPF já cadastrado para outro paciente",
          existingPatient: cpfCheckResult.rows[0].nome,
          cpf: formattedCpf
        });
      }
    }

    // Format dates for database (DD/MM/YYYY -> YYYY-MM-DD)
    const formatDateForDB = (dateString: string | undefined | null): string | null => {
      if (!dateString) return null;
      try {
        // If it's already in YYYY-MM-DD format, return as is
        if (dateString.includes('-')) return dateString;
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } catch (error: any) {
        console.error('Error formatting date for DB:', dateString, error);
        return null;
      }
    };

    // Format CPF for storage (XXX.XXX.XXX-XX)
    function formatCpfForStorage(cpfInput: string): string | null {
      if (!cpfInput || !cpfInput.trim()) return null;

      const cleanCpf = cpfInput.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return null;

      return `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`;
    }

    // Format CEP for storage (XXXXX-XXX)
    function formatCepForStorage(cepInput: string): string | null {
      if (!cepInput || !cepInput.trim()) return null;

      const cleanCep = cepInput.replace(/\D/g, '');
      if (cleanCep.length !== 8) return null;

      return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`;
    }

    // Format phone for storage (only digits)
    function formatPhoneForStorage(phoneInput: string): string | null {
      if (!phoneInput || !phoneInput.trim()) return null;
      return phoneInput.replace(/\D/g, '');
    }

    // Create the patient with ALL fields
    console.log("Creating patient with data:", {
      nome,
      email: email || null,
      telefone: formatPhoneForStorage(telefone),
      cpf: formatCpfForStorage(cpf),
      therapistId,
      sessionPrice: sessionPrice || null,
      therapyStartDate: formatDateForDB(therapyStartDate),
      lvNotasBillingStartDate: formatDateForDB(lvNotasBillingStartDate),
      observacoes: observacoes || null,
      // Address
      enderecoRua: enderecoRua?.trim() || null,
      enderecoNumero: enderecoNumero?.trim() || null,
      enderecoBairro: enderecoBairro?.trim() || null,
      enderecoCodigoMunicipio: enderecoCodigoMunicipio?.trim() || '3550308', // São Paulo default
      enderecoUf: enderecoUf?.trim() || 'SP', // São Paulo default
      enderecoCep: formatCepForStorage(enderecoCep),
      // Personal info
      dataNascimento: formatDateForDB(dataNascimento),
      genero: genero?.trim() || null,
      contatoEmergenciaNome: contatoEmergenciaNome?.trim() || null,
      contatoEmergenciaTelefone: formatPhoneForStorage(contatoEmergenciaTelefone)
    });

    const result = await pool.query(
      `INSERT INTO patients (
        nome, 
        email, 
        telefone, 
        cpf,
        therapist_id, 
        preco,
        therapy_start_date,
        lv_notas_billing_start_date,
        notes,
        endereco_rua,
        endereco_numero,
        endereco_bairro,
        endereco_codigo_municipio,
        endereco_uf,
        endereco_cep,
        data_nascimento,
        genero,
        contato_emergencia_nome,
        contato_emergencia_telefone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING 
        id, 
        nome as name, 
        email, 
        telefone,
        cpf,
        CAST(preco AS INTEGER) as "sessionPrice",
        therapy_start_date as "therapyStartDate",
        lv_notas_billing_start_date as "lvNotasBillingStartDate",
        notes as observacoes,
        endereco_rua as "enderecoRua",
        endereco_numero as "enderecoNumero", 
        endereco_bairro as "enderecoBairro",
        endereco_codigo_municipio as "enderecoCodigoMunicipio",
        endereco_uf as "enderecoUf",
        endereco_cep as "enderecoCep",
        data_nascimento as "dataNascimento",
        genero,
        contato_emergencia_nome as "contatoEmergenciaNome",
        contato_emergencia_telefone as "contatoEmergenciaTelefone"`,
      [
        nome,
        email || null,
        formatPhoneForStorage(telefone),
        formatCpfForStorage(cpf),
        therapistId,
        sessionPrice || null,
        formatDateForDB(therapyStartDate),
        formatDateForDB(lvNotasBillingStartDate),
        observacoes || null,
        enderecoRua?.trim() || null,
        enderecoNumero?.trim() || null,
        enderecoBairro?.trim() || null,
        enderecoCodigoMunicipio?.trim() || '3550308',
        enderecoUf?.trim() || 'SP',
        formatCepForStorage(enderecoCep),
        formatDateForDB(dataNascimento),
        genero?.trim() || null,
        contatoEmergenciaNome?.trim() || null,
        formatPhoneForStorage(contatoEmergenciaTelefone)
      ]
    );

    console.log("Patient created successfully:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.log("Database error:", error);
    return res.status(500).json({
      error: "Database error occurred while creating patient",
      details: error.message,
      therapistEmail: therapistEmail,
      patientName: nome
    });
  }
}));

// PUT /api/patients/:id - Update patient (ENHANCED with all new fields)
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    email,
    telefone,
    cpf,
    sessionPrice,
    therapyStartDate,
    lvNotasBillingStartDate,
    observacoes,
    // Address fields
    enderecoRua,
    enderecoNumero,
    enderecoBairro,
    enderecoCodigoMunicipio,
    enderecoUf,
    enderecoCep,
    // Personal info fields
    dataNascimento,
    genero,
    contatoEmergenciaNome,
    contatoEmergenciaTelefone
  } = req.body;

  console.log('UPDATE PATIENT DEBUG:');
  console.log('Patient ID:', id);
  console.log('Request body:', req.body);

  if (!nome || !email) {
    return res.status(400).json({ error: "Nome and email are required" });
  }

  // CPF validation if provided
  if (cpf && cpf.trim()) {
    const cleanCpf = cpf.replace(/\D/g, '');

    // Basic CPF format validation (11 digits)
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: "CPF deve ter 11 dígitos",
        receivedCpf: cpf
      });
    }

    // Check for common invalid CPFs (all same digits)
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return res.status(400).json({
        error: "CPF inválido - não pode ter todos os dígitos iguais",
        receivedCpf: cpf
      });
    }
  }

  // CEP validation if provided
  if (enderecoCep && enderecoCep.trim()) {
    const cleanCep = enderecoCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return res.status(400).json({
        error: "CEP deve ter 8 dígitos",
        receivedCep: enderecoCep
      });
    }
  }

  try {
    // Format functions (same as in POST)
    function formatCpfForStorage(cpfInput: string | undefined): string | null {
      if (!cpfInput || !cpfInput.trim()) return null;

      const cleanCpf = cpfInput.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return null;

      return `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`;
    }

    function formatCepForStorage(cepInput: string | undefined): string | null {
      if (!cepInput || !cepInput.trim()) return null;

      const cleanCep = cepInput.replace(/\D/g, '');
      if (cleanCep.length !== 8) return null;

      return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`;
    }

    function formatPhoneForStorage(phoneInput: string | undefined): string | null {
      if (!phoneInput || !phoneInput.trim()) return null;
      return phoneInput.replace(/\D/g, '');
    }

    const formatDateForDB = (dateString: string | undefined | null): string | null => {
      if (!dateString) return null;
      try {
        // If it's already in YYYY-MM-DD format, return as is
        if (dateString.includes('-')) return dateString;
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const [day, month, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } catch (error: any) {
        console.error('Error formatting date for DB:', dateString, error);
        return null;
      }
    };

    // Check for duplicate CPF if provided (excluding current patient)
    if (cpf && cpf.trim()) {
      const formattedCpf = formatCpfForStorage(cpf);
      const cpfCheckResult = await pool.query(
        "SELECT id, nome FROM patients WHERE cpf = $1 AND id != $2",
        [formattedCpf, id]
      );

      if (cpfCheckResult.rows.length > 0) {
        return res.status(400).json({
          error: "CPF já cadastrado para outro paciente",
          existingPatient: cpfCheckResult.rows[0].nome,
          cpf: formattedCpf
        });
      }
    }

    const result = await pool.query(
      `UPDATE patients 
       SET 
         nome = $1, 
         email = $2, 
         telefone = $3,
         cpf = $4,
         preco = $5,
         therapy_start_date = $6,
         lv_notas_billing_start_date = $7,
         notes = $8,
         endereco_rua = $9,
         endereco_numero = $10,
         endereco_bairro = $11,
         endereco_codigo_municipio = $12,
         endereco_uf = $13,
         endereco_cep = $14,
         data_nascimento = $15,
         genero = $16,
         contato_emergencia_nome = $17,
         contato_emergencia_telefone = $18
       WHERE id = $19 
       RETURNING 
         id, 
         nome as name, 
         email, 
         telefone,
         cpf,
         CAST(preco AS INTEGER) as sessionPrice,
         therapy_start_date as therapyStartDate,
         lv_notas_billing_start_date as lvNotasBillingStartDate,
         notes as observacoes,
         endereco_rua as "enderecoRua",
         endereco_numero as "enderecoNumero", 
         endereco_bairro as "enderecoBairro",
         endereco_codigo_municipio as "enderecoCodigoMunicipio",
         endereco_uf as "enderecoUf",
         endereco_cep as "enderecoCep",
         data_nascimento as "dataNascimento",
         genero,
         contato_emergencia_nome as "contatoEmergenciaNome",
         contato_emergencia_telefone as "contatoEmergenciaTelefone"`,
      [
        nome,
        email || null,
        formatPhoneForStorage(telefone),
        formatCpfForStorage(cpf),
        sessionPrice || null,
        formatDateForDB(therapyStartDate),
        formatDateForDB(lvNotasBillingStartDate),
        observacoes || null,
        enderecoRua?.trim() || null,
        enderecoNumero?.trim() || null,
        enderecoBairro?.trim() || null,
        enderecoCodigoMunicipio?.trim() || null,
        enderecoUf?.trim() || null,
        formatCepForStorage(enderecoCep),
        formatDateForDB(dataNascimento),
        genero?.trim() || null,
        contatoEmergenciaNome?.trim() || null,
        formatPhoneForStorage(contatoEmergenciaTelefone),
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    console.log("Patient updated successfully:", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Database error occurred while updating patient" });
  }
}));

// DELETE /api/patients/:id - Delete patient (unchanged)
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // First check if patient has any sessions
    const sessionsResult = await pool.query(
      "SELECT COUNT(*) as count FROM sessions WHERE patient_id = $1",
      [id]
    );

    if (parseInt(sessionsResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete patient with existing sessions",
        message: "Este paciente possui sessões cadastradas e não pode ser excluído"
      });
    }

    const result = await pool.query(
      "DELETE FROM patients WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json({ message: "Patient deleted successfully" });
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Database error occurred while deleting patient" });
  }
}));

// ============================================================================
// NEW ENHANCED ENDPOINTS (Dual Date System & Billing) - keeping existing ones
// ============================================================================

// GET /api/patients/full?therapistEmail=email - Get patients with complete dual date & billing info
router.get("/full", asyncHandler(async (req, res) => {
  const { therapistEmail } = req.query;

  if (!therapistEmail) {
    return res.status(400).json({ error: "therapistEmail parameter is required" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        p.id, p.nome as name, p.email, p.telefone,
        p.therapy_start_date, p.lv_notas_billing_start_date,
        p.billing_cycle_override, p.session_price_override,
        p.created_at,
        t.billing_cycle as therapist_billing_cycle,
        t.default_session_price as therapist_session_price
       FROM patients p 
       INNER JOIN therapists t ON p.therapist_id = t.id 
       WHERE t.email = $1 
       ORDER BY p.nome ASC`,
      [therapistEmail]
    );

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching full patient data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// POST /api/patients/enhanced - Create patient with dual date system
router.post("/enhanced", asyncHandler(async (req, res) => {
  const {
    nome,
    email,
    telefone,
    therapistEmail,
    therapy_start_date,
    lv_notas_billing_start_date,
    billing_cycle_override,
    session_price_override
  } = req.body;

  console.log("=== CREATE ENHANCED PATIENT REQUEST ===");
  console.log("Request body:", req.body);

  if (!nome || !email || !therapistEmail || !lv_notas_billing_start_date) {
    const missingFields = [];
    if (!nome) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!therapistEmail) missingFields.push('therapistEmail');
    if (!lv_notas_billing_start_date) missingFields.push('lv_notas_billing_start_date');

    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
      note: "lv_notas_billing_start_date is required for the dual date system"
    });
  }

  // Validate billing cycle override if provided
  if (billing_cycle_override && !isBillingCycle(billing_cycle_override)) {
    return res.status(400).json({
      error: "Invalid billing cycle override",
      valid_options: ['monthly', 'weekly', 'per_session', 'ad_hoc']
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    // Create the enhanced patient (simplified - let Google Calendar handle recurring patterns)
    const result = await pool.query(
      `INSERT INTO patients (
        nome, email, telefone, therapist_id,
        therapy_start_date, lv_notas_billing_start_date,
        billing_cycle_override, session_price_override
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        nome,
        email,
        telefone || null,
        therapistId,
        therapy_start_date ? new Date(therapy_start_date) : null,
        new Date(lv_notas_billing_start_date),
        billing_cycle_override || null,
        session_price_override || null
      ]
    );

    console.log("Enhanced patient created successfully:", result.rows[0]);
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Database error:", error);
    return res.status(500).json({
      error: "Database error occurred while creating enhanced patient",
      details: error.message
    });
  }
}));

// POST /api/patients/bulk - Bulk create patients (for onboarding)
router.post("/bulk", asyncHandler(async (req, res) => {
  const { therapistEmail, patients } = req.body as BulkPatientCreateRequest;

  if (!therapistEmail || !patients || !Array.isArray(patients)) {
    return res.status(400).json({
      error: "therapistEmail and patients array are required"
    });
  }

  try {
    // Get therapist ID
    const therapistResult = await pool.query(
      "SELECT id FROM therapists WHERE email = $1",
      [therapistEmail]
    );

    if (therapistResult.rows.length === 0) {
      return res.status(404).json({ error: "Therapist not found" });
    }

    const therapistId = therapistResult.rows[0].id;

    const createdPatients: Patient[] = [];
    const errors: Array<{ index: number; error: string; patient_data: any }> = [];

    // Process each patient
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];

      try {
        // Validate required fields
        if (!patient.nome || !patient.lv_notas_billing_start_date) {
          errors.push({
            index: i,
            error: "Missing required fields: nome and lv_notas_billing_start_date",
            patient_data: patient
          });
          continue;
        }

        const result = await pool.query(
          `INSERT INTO patients (
            nome, email, telefone, therapist_id,
            therapy_start_date, lv_notas_billing_start_date
          ) VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING *`,
          [
            patient.nome,
            patient.email || null,
            patient.telefone || null,
            therapistId,
            patient.therapy_start_date ? new Date(patient.therapy_start_date) : null,
            new Date(patient.lv_notas_billing_start_date)
          ]
        );

        createdPatients.push(result.rows[0]);
      } catch (patientError: any) {
        errors.push({
          index: i,
          error: patientError.message,
          patient_data: patient
        });
      }
    }

    const response = {
      created_patients: createdPatients,
      errors: errors,
      summary: {
        total_requested: patients.length,
        successfully_created: createdPatients.length,
        failed: errors.length
      }
    };

    // Return 207 Multi-Status if some succeeded and some failed
    const statusCode = errors.length > 0 ? (createdPatients.length > 0 ? 207 : 400) : 201;
    return res.status(statusCode).json(response);

  } catch (error: any) {
    console.error("Bulk create error:", error);
    return res.status(500).json({ error: "Internal server error during bulk creation" });
  }
}));

// PUT /api/patients/:id/billing-cycle - Change patient-specific billing
router.put("/:id/billing-cycle", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { billingCycle, sessionPrice, effectiveDate, reason, therapistEmail } = req.body;

  if (!billingCycle || !sessionPrice || !therapistEmail) {
    return res.status(400).json({
      error: "billingCycle, sessionPrice, and therapistEmail are required"
    });
  }

  if (!isBillingCycle(billingCycle)) {
    return res.status(400).json({
      error: "Invalid billing cycle",
      valid_options: ['monthly', 'weekly', 'per_session', 'ad_hoc']
    });
  }

  if (sessionPrice <= 0) {
    return res.status(400).json({ error: "Session price must be greater than 0" });
  }

  const effectiveDateTime = effectiveDate ? new Date(effectiveDate) : new Date();

  try {
    // Verify patient exists and belongs to therapist
    const patientResult = await pool.query(
      `SELECT p.id, t.email 
       FROM patients p 
       JOIN therapists t ON p.therapist_id = t.id 
       WHERE p.id = $1 AND t.email = $2`,
      [id, therapistEmail]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found or not accessible" });
    }

    // Use the database function to change patient billing cycle
    const result = await pool.query(
      `SELECT change_patient_billing_cycle($1, $2, $3, $4, $5, $6) as success`,
      [id, billingCycle, sessionPrice, effectiveDateTime, reason || null, therapistEmail]
    );

    if (result.rows[0].success) {
      // Get updated patient data
      const updatedPatient = await pool.query(
        `SELECT * FROM patients WHERE id = $1`,
        [id]
      );

      return res.json({
        message: "Patient billing cycle updated successfully",
        patient: updatedPatient.rows[0],
        effective_date: effectiveDateTime
      });
    } else {
      return res.status(500).json({ error: "Failed to update patient billing cycle" });
    }
  } catch (error: any) {
    console.error("Error updating patient billing cycle:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/patients/:id/billing-history - Get patient billing change history
router.get("/:id/billing-history", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT pbh.*, p.nome as patient_name
       FROM patient_billing_history pbh
       JOIN patients p ON pbh.patient_id = p.id
       WHERE pbh.patient_id = $1
       ORDER BY pbh.effective_date DESC`,
      [id]
    );

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching patient billing history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

// GET /api/patients/:id/billing-summary - Get current billing settings for patient
router.get("/:id/billing-summary", asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM current_billing_settings WHERE patient_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching patient billing summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}));

export default router;