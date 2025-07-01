// clinic-api/scripts/generateTestCalendarData.ts
// Run this to populate your test calendar with realistic therapy session data

import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestPatient {
  name: string;
  email: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlot: string; // "09:00" format
  startDate: Date;
}

// Realistic patient data (20 patients like your mom probably has)
const FULL_TEST_PATIENTS: TestPatient[] = [
  { name: 'Ana Silva', email: 'ana.silva@gmail.com', frequency: 'weekly', dayOfWeek: 1, timeSlot: '09:00', startDate: new Date('2024-01-08') },
  { name: 'Maria Santos', email: 'maria.santos@hotmail.com', frequency: 'weekly', dayOfWeek: 1, timeSlot: '10:00', startDate: new Date('2024-01-08') },
  { name: 'João Oliveira', email: 'joao.oliveira@gmail.com', frequency: 'biweekly', dayOfWeek: 2, timeSlot: '14:00', startDate: new Date('2024-01-09') },
  { name: 'Fernanda Costa', email: 'fernanda.costa@yahoo.com', frequency: 'weekly', dayOfWeek: 2, timeSlot: '15:00', startDate: new Date('2024-01-09') },
  { name: 'Ricardo Pereira', email: 'ricardo.pereira@gmail.com', frequency: 'weekly', dayOfWeek: 3, timeSlot: '09:30', startDate: new Date('2024-01-10') },
  { name: 'Carla Rodrigues', email: 'carla.rodrigues@outlook.com', frequency: 'weekly', dayOfWeek: 3, timeSlot: '11:00', startDate: new Date('2024-01-10') },
  { name: 'Paulo Mendes', email: 'paulo.mendes@gmail.com', frequency: 'monthly', dayOfWeek: 4, timeSlot: '16:00', startDate: new Date('2024-01-11') },
  { name: 'Juliana Lima', email: 'juliana.lima@gmail.com', frequency: 'weekly', dayOfWeek: 4, timeSlot: '10:30', startDate: new Date('2024-01-11') },
  { name: 'Marcos Ferreira', email: 'marcos.ferreira@hotmail.com', frequency: 'biweekly', dayOfWeek: 5, timeSlot: '13:00', startDate: new Date('2024-01-12') },
  { name: 'Lucia Nascimento', email: 'lucia.nascimento@gmail.com', frequency: 'weekly', dayOfWeek: 5, timeSlot: '14:30', startDate: new Date('2024-01-12') },
  
  // Add 10 more for realistic volume
  { name: 'Roberto Alves', email: 'roberto.alves@gmail.com', frequency: 'weekly', dayOfWeek: 1, timeSlot: '16:00', startDate: new Date('2024-02-05') },
  { name: 'Patricia Gomes', email: 'patricia.gomes@yahoo.com', frequency: 'weekly', dayOfWeek: 2, timeSlot: '08:00', startDate: new Date('2024-02-06') },
  { name: 'Eduardo Santos', email: 'eduardo.santos@gmail.com', frequency: 'biweekly', dayOfWeek: 3, timeSlot: '17:00', startDate: new Date('2024-02-07') },
  { name: 'Camila Souza', email: 'camila.souza@hotmail.com', frequency: 'weekly', dayOfWeek: 4, timeSlot: '08:30', startDate: new Date('2024-02-08') },
  { name: 'Diego Barbosa', email: 'diego.barbosa@outlook.com', frequency: 'weekly', dayOfWeek: 5, timeSlot: '15:30', startDate: new Date('2024-02-09') },
  { name: 'Renata Castro', email: 'renata.castro@gmail.com', frequency: 'monthly', dayOfWeek: 1, timeSlot: '13:30', startDate: new Date('2024-03-04') },
  { name: 'Felipe Rocha', email: 'felipe.rocha@gmail.com', frequency: 'weekly', dayOfWeek: 2, timeSlot: '12:00', startDate: new Date('2024-03-05') },
  { name: 'Amanda Dias', email: 'amanda.dias@yahoo.com', frequency: 'biweekly', dayOfWeek: 3, timeSlot: '16:30', startDate: new Date('2024-03-06') },
  { name: 'Bruno Cardoso', email: 'bruno.cardoso@gmail.com', frequency: 'weekly', dayOfWeek: 4, timeSlot: '09:00', startDate: new Date('2024-03-07') },
  { name: 'Cristina Moura', email: 'cristina.moura@hotmail.com', frequency: 'weekly', dayOfWeek: 5, timeSlot: '11:30', startDate: new Date('2024-03-08') },
];

// Basic sample data for quick testing (5 patients, 2-5 sessions each)
const BASIC_TEST_PATIENTS: TestPatient[] = [
  { name: 'Ana Silva', email: 'ana.silva@gmail.com', frequency: 'weekly', dayOfWeek: 1, timeSlot: '09:00', startDate: new Date('2025-06-16') }, // 2 weeks ago
  { name: 'João Oliveira', email: 'joao.oliveira@gmail.com', frequency: 'weekly', dayOfWeek: 2, timeSlot: '14:00', startDate: new Date('2025-06-10') }, // 3 weeks ago  
  { name: 'Maria Santos', email: 'maria.santos@hotmail.com', frequency: 'weekly', dayOfWeek: 3, timeSlot: '10:00', startDate: new Date('2025-06-18') }, // 1.5 weeks ago
  { name: 'Carlos Lima', email: 'carlos.lima@gmail.com', frequency: 'weekly', dayOfWeek: 4, timeSlot: '15:00', startDate: new Date('2025-06-12') }, // 2.5 weeks ago
  { name: 'Fernanda Costa', email: 'fernanda.costa@yahoo.com', frequency: 'weekly', dayOfWeek: 5, timeSlot: '11:00', startDate: new Date('2025-06-20') }, // 1 week ago
];

class TestCalendarGenerator {
  private calendar: any;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'service-account-key.json'),
      scopes: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ],
    });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  async generateTestData(calendarId: string, dataType: 'basic' | 'full' = 'basic'): Promise<void> {
    const patients = dataType === 'full' ? FULL_TEST_PATIENTS : BASIC_TEST_PATIENTS;
    const isBasicSample = dataType === 'basic';
    
    console.log('🗓️ Starting test calendar data generation...');
    console.log(`📅 Target calendar: ${calendarId}`);
    console.log(`📊 Data type: ${dataType} (${patients.length} patients)`);
    
    let totalEventsCreated = 0;
    let totalEventsPlanned = 0;

    // First pass: calculate total events to create
    for (const patient of patients) {
      const sessions = this.generateSessionsForPatient(patient, isBasicSample);
      totalEventsPlanned += sessions.length;
    }

    console.log(`🎯 Planning to create ${totalEventsPlanned} events total`);
    console.log('');

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      console.log(`👤 [${i + 1}/${patients.length}] Creating sessions for ${patient.name}...`);
      
      const sessions = this.generateSessionsForPatient(patient, isBasicSample);
      
      for (let j = 0; j < sessions.length; j++) {
        const session = sessions[j];
        try {
          await this.createCalendarEvent(calendarId, patient, session);
          totalEventsCreated++;
          
          // Update progress on same line
          process.stdout.write(`\r📅 Creating events... ${totalEventsCreated}/${totalEventsPlanned} (${patient.name}: ${j + 1}/${sessions.length})`);
          
          // Small delay to avoid rate limiting
          await this.sleep(100);
        } catch (error) {
          console.error(`\n❌ Error creating session for ${patient.name}:`, error);
        }
      }
      
      console.log(`\n✅ Created ${sessions.length} sessions for ${patient.name}`);
    }

    console.log('');
    console.log(`🎉 Test data generation complete!`);
    console.log(`📊 Total events created: ${totalEventsCreated}/${totalEventsPlanned}`);
    console.log(`👥 Total patients: ${patients.length}`);
    
    if (dataType === 'basic') {
      console.log(`📝 Basic sample created - ${Math.round(totalEventsCreated/patients.length)} sessions per patient on average`);
      console.log(`📅 Events span from past to future for realistic testing`);
    } else {
      console.log(`🔥 Full simulation created - shows real-world therapy practice scenario`);
    }
  }

  private generateSessionsForPatient(patient: TestPatient, isBasicSample: boolean = false): Date[] {
    const sessions: Date[] = [];
    
    if (isBasicSample) {
      // For basic sample: only 2-5 sessions per patient, spanning past and future
      const today = new Date();
      const maxSessions = Math.floor(Math.random() * 4) + 2; // 2-5 sessions
      let currentDate = new Date(patient.startDate);
      let sessionCount = 0;
      
      // Generate sessions until we have enough or reach too far in future
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 21); // 3 weeks in future
      
      while (sessionCount < maxSessions && currentDate <= maxDate) {
        // Ensure we're on the correct day of week
        while (currentDate.getDay() !== patient.dayOfWeek) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (currentDate <= maxDate) {
          // Set the time
          const [hours, minutes] = patient.timeSlot.split(':');
          const sessionDate = new Date(currentDate);
          sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          sessions.push(new Date(sessionDate));
          sessionCount++;
        }

        // Move to next session (always weekly for basic sample)
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      return sessions;
    }
    
    // For full sample: generate many sessions over months
    const endDate = new Date(); // Today
    let currentDate = new Date(patient.startDate);

    while (currentDate <= endDate) {
      // Ensure we're on the correct day of week
      while (currentDate.getDay() !== patient.dayOfWeek) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (currentDate <= endDate) {
        // Set the time
        const [hours, minutes] = patient.timeSlot.split(':');
        const sessionDate = new Date(currentDate);
        sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        sessions.push(new Date(sessionDate));
      }

      // Move to next session based on frequency
      switch (patient.frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return sessions;
  }

  private async createCalendarEvent(calendarId: string, patient: TestPatient, sessionDate: Date): Promise<void> {
    const endTime = new Date(sessionDate);
    endTime.setHours(endTime.getHours() + 1); // 1-hour sessions

    // Vary the event title format (like real calendars have inconsistency)
    const titleFormats = [
      `Sessão - ${patient.name}`,
      `Terapia ${patient.name}`,
      `${patient.name} - Sessão`,
      `Consulta - ${patient.name}`,
      `${patient.name}`
    ];
    
    const title = titleFormats[Math.floor(Math.random() * titleFormats.length)];

    const event = {
      summary: title,
      description: `Sessão de terapia com ${patient.name} - Email: ${patient.email}`,
      start: {
        dateTime: sessionDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      }
      // Removed attendees to avoid Domain-Wide Delegation requirement
      // The email will be in the description instead
    };

    await this.calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearTestData(calendarId: string): Promise<void> {
    console.log('🧹 Clearing existing test data...');
    
    try {
      // Get events from the last year
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      const events = response.data.items || [];
      console.log(`📋 Found ${events.length} existing events`);

      if (events.length === 0) {
        console.log('✅ No events to clear');
        return;
      }

      let deletedCount = 0;
      for (const event of events) {
        try {
          await this.calendar.events.delete({
            calendarId: calendarId,
            eventId: event.id
          });
          
          deletedCount++;
          // Update progress on same line
          process.stdout.write(`\r🗑️  Deleting events... ${deletedCount}/${events.length}`);
          
          // Small delay to avoid rate limiting
          await this.sleep(50);
        } catch (error) {
          console.warn(`\n⚠️ Could not delete event ${event.id}:`, error);
        }
      }

      console.log(`\n✅ Calendar cleared successfully - removed ${deletedCount} events`);
    } catch (error) {
      console.error('❌ Error clearing calendar:', error);
    }
  }
}

// CLI interface
async function promptUser(question: string, options: string[]): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(question);
    options.forEach((option, index) => {
      console.log(`${index + 1}) ${option}`);
    });
    console.log('');
    
    rl.question('📝 Enter your choice: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Usage script
async function main() {
  const generator = new TestCalendarGenerator();
  
  // Get command from arguments or environment
  const args = process.argv.slice(2);
  const command = args[0]; // 'clear' or 'generate'
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const dataType = (process.env.DATA_TYPE as 'basic' | 'full') || 'basic';
  
  // If called with a command argument, run silently (called from bash script)
  if (command && calendarId) {
    switch (command) {
      case 'clear':
        console.log('🧹 Clearing existing test data...');
        await generator.clearTestData(calendarId);
        break;
      case 'generate':
        console.log(`📅 Generating ${dataType} test data...`);
        await generator.generateTestData(calendarId, dataType);
        break;
    }
    return; // Exit without showing interactive CLI
  }
  
  // Interactive CLI mode (only when run directly with no arguments)
  console.log('🚀 LV Notas Test Calendar Generator');
  console.log('================================');
  console.log('');
  
  // Calendar selection
  let selectedCalendarId = calendarId || 'primary';
  
  if (!calendarId) {
    const calendarChoice = await promptUser(
      '📅 Choose your calendar:',
      [
        'Use primary calendar',
        'Use Dan\'s test calendar',
        'Enter custom calendar ID'
      ]
    );
    
    switch (calendarChoice) {
      case '1':
        selectedCalendarId = 'primary';
        break;
      case '2':
        selectedCalendarId = '6f3842a5e7b8b63095e840cc28684fd52e17ff25ef173e49b2e5219ed676f652@group.calendar.google.com';
        break;
      case '3':
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        selectedCalendarId = await new Promise((resolve) => {
          rl.question('📝 Enter calendar ID: ', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });
        break;
      default:
        selectedCalendarId = 'primary';
    }
  }
  
  console.log(`✅ Using calendar: ${selectedCalendarId}`);
  console.log('');
  
  // Use data type from environment if available, otherwise ask
  let selectedDataType: 'basic' | 'full' = dataType;
  
  if (!process.env.DATA_TYPE) {
    const dataTypeChoice = await promptUser(
      '📊 Choose data type:',
      [
        '📝 Basic Sample (5 patients, 2-5 sessions each)',
        '🔥 Full Simulation (20 patients, 10-20 sessions each)'
      ]
    );
    
    selectedDataType = dataTypeChoice === '2' ? 'full' : 'basic';
    console.log('');
  }
  
  // Action selection
  const actionChoice = await promptUser(
    '⚡ What would you like to do?',
    [
      `Generate ${selectedDataType} test data`,
      'Clear existing test data',
      `Both (clear then generate ${selectedDataType})`
    ]
  );
  
  console.log('');
  
  switch (actionChoice) {
    case '1':
      console.log(`📅 Generating ${selectedDataType} test data...`);
      await generator.generateTestData(selectedCalendarId, selectedDataType);
      break;
    case '2':
      console.log('🧹 Clearing test data...');
      await generator.clearTestData(selectedCalendarId);
      break;
    case '3':
      console.log('🧹 Clearing existing data...');
      await generator.clearTestData(selectedCalendarId);
      console.log(`📅 Generating ${selectedDataType} test data...`);
      await generator.generateTestData(selectedCalendarId, selectedDataType);
      break;
    default:
      console.log('❌ Invalid choice, generating basic test data...');
      await generator.generateTestData(selectedCalendarId, 'basic');
  }
  
  console.log('✅ Operation completed!');
}

// Run the script - ES module equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestCalendarGenerator, FULL_TEST_PATIENTS, BASIC_TEST_PATIENTS };