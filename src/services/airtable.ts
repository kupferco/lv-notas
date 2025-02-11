import Airtable from 'airtable';
import { config } from '../config';

const base = new Airtable({ apiKey: config.airtableApiKey }).base(config.airtableBaseId);

export const airtableService = {
  async getPatients() {
    const records = await base('Patients')
      .select({
        fields: ['Patient Name'],
        sort: [{ field: 'Patient Name', direction: 'asc' }]
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      name: record.get('Patient Name') as string,
    }));
  },

  async getPatientSessions(patientId: string) {
    const records = await base('Sessions')
      .select({
        fields: ['Session ID', 'Session Date', 'Patient'],
        filterByFormula: `{Patient} = '${patientId}'`,
        sort: [{ field: 'Session Date', direction: 'desc' }]
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      date: record.get('Session Date') as string,
    }));
  },

  async submitCheckIn(patientId: string, sessionId: string) {
    return await base('Check Ins').create([
      {
        fields: {
          'Patient': [patientId],
          'Session ID': [sessionId],
          'Status': 'Compareceu',
          'Created By': 'Cristina Kupfer',
          'Date': new Date().toISOString()
        }
      }
    ]);
  }
};
