// src/services/api/patient-service.ts - Updated Patient API Service
import type { Patient } from "../../types/index";
import { baseApiService } from './base-service';

const { makeApiCall, canMakeAuthenticatedCall, getCurrentTherapistEmail, validateRequired, validateEmail, handleApiError } = baseApiService;

export const patientService = {
  // ==========================================
  // PATIENT MANAGEMENT
  // ==========================================

  async getPatients(therapistEmail?: string): Promise<Patient[]> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      const email = therapistEmail || getCurrentTherapistEmail();
      validateRequired(email, 'Therapist email');
      validateEmail(email as string);

      console.log("📞 getPatients API call with email:", email);
      return await makeApiCall<Patient[]>(`/api/patients?therapistEmail=${encodeURIComponent(email as string)}`);
    } catch (error) {
      return handleApiError(error as Error, 'getPatients');
    }
  },

  async createPatient(patient: Patient): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      // Validate required fields
      validateRequired(patient.nome, 'Patient name');
      validateRequired(patient.email, 'Patient email');
      validateEmail(patient.email!);
      validateRequired(patient.therapistEmail, 'Therapist email');
      validateEmail(patient.therapistEmail!);

      console.log("📞 createPatient API call:", patient);
      return await makeApiCall<Patient>(`/api/patients`, {
        method: "POST",
        body: JSON.stringify({
          // Basic info
          nome: patient.nome,
          email: patient.email,
          telefone: patient.telefone || '',
          cpf: patient.cpf || '',
          therapistEmail: patient.therapistEmail,
          sessionPrice: patient.sessionPrice || 30000,
          therapyStartDate: patient.therapyStartDate || '',
          lvNotasBillingStartDate: patient.lvNotasBillingStartDate || '',
          observacoes: patient.observacoes || '',
          
          // Address fields
          enderecoRua: patient.enderecoRua || '',
          enderecoNumero: patient.enderecoNumero || '',
          enderecoBairro: patient.enderecoBairro || '',
          enderecoCodigoMunicipio: patient.enderecoCodigoMunicipio || '3550308',
          enderecoUf: patient.enderecoUf || 'SP',
          enderecoCep: patient.enderecoCep || '',
          
          // Personal info fields
          dataNascimento: patient.dataNascimento || '',
          genero: patient.genero || '',
          contatoEmergenciaNome: patient.contatoEmergenciaNome || '',
          contatoEmergenciaTelefone: patient.contatoEmergenciaTelefone || ''
        }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'createPatient');
    }
  },

  async updatePatient(patientId: string, patient: Patient): Promise<Patient> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(patientId, 'Patient ID');
      validateRequired(patient.nome, 'Patient name');
      
      if (patient.email) {
        validateEmail(patient.email);
      }

      console.log("📞 updatePatient API call:", { patientId, patient });
      return await makeApiCall<Patient>(`/api/patients/${patientId}`, {
        method: "PUT",
        body: JSON.stringify({
          // Basic info
          nome: patient.nome,
          email: patient.email || '',
          telefone: patient.telefone || '',
          cpf: patient.cpf || '',
          sessionPrice: patient.sessionPrice,
          therapyStartDate: patient.therapyStartDate || '',
          lvNotasBillingStartDate: patient.lvNotasBillingStartDate || '',
          observacoes: patient.observacoes || '',
          
          // Address fields
          enderecoRua: patient.enderecoRua || '',
          enderecoNumero: patient.enderecoNumero || '',
          enderecoBairro: patient.enderecoBairro || '',
          enderecoCodigoMunicipio: patient.enderecoCodigoMunicipio || '',
          enderecoUf: patient.enderecoUf || '',
          enderecoCep: patient.enderecoCep || '',
          
          // Personal info fields
          dataNascimento: patient.dataNascimento || '',
          genero: patient.genero || '',
          contatoEmergenciaNome: patient.contatoEmergenciaNome || '',
          contatoEmergenciaTelefone: patient.contatoEmergenciaTelefone || ''
        }),
      });
    } catch (error) {
      return handleApiError(error as Error, 'updatePatient');
    }
  },

  async deletePatient(patientId: string): Promise<void> {
    if (!canMakeAuthenticatedCall()) {
      throw new Error("Authentication required for API calls");
    }

    try {
      validateRequired(patientId, 'Patient ID');

      console.log("📞 deletePatient API call:", patientId);
      await makeApiCall<void>(`/api/patients/${patientId}`, {
        method: "DELETE",
      });
      console.log("✅ deletePatient success");
    } catch (error) {
      return handleApiError(error as Error, 'deletePatient');
    }
  },
};