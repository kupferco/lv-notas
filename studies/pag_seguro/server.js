// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (no database!)
const payments = new Map();
const therapists = new Map();
const webhookLogs = [];

// Mock data for testing
therapists.set('therapist1', {
  id: 'therapist1',
  name: 'Dr. João Silva',
  email: 'joao@email.com',
  pixKey: 'joao@email.com',
  recipientId: 'MOCK_RECIPIENT_123', // Will be real PagSeguro recipient ID
  sharePercentage: 90 // Therapist gets 90%, platform gets 10%
});

// ============ PAGSEGURO SERVICE ============
class PagSeguroService {
  constructor() {
    this.apiUrl = process.env.PAGSEGURO_API_URL;
    this.token = process.env.PAGSEGURO_TOKEN;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  async createRecipient(therapistData) {
    if (this.isDevelopment && this.token === 'TEST_your_token_here_when_available') {
      // Return mock recipient
      return {
        id: `MOCK_RECIPIENT_${Date.now()}`,
        name: therapistData.name,
        status: 'ACTIVE'
      };
    }

    // Real PagSeguro API call
    const response = await fetch(`${this.apiUrl}/recipients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        name: therapistData.name,
        email: therapistData.email,
        tax_id: therapistData.cpf,
        default_bank_account: {
          type: 'PIX',
          pix_key: therapistData.pixKey
        }
      })
    });

    if (!response.ok) {
      throw new Error(`PagSeguro API Error: ${response.status}`);
    }

    return await response.json();
  }

  async createSplitPayment(paymentData) {
    if (this.isDevelopment && this.token === 'TEST_your_token_here_when_available') {
      // Return mock payment
      const mockId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: mockId,
        reference_id: paymentData.referenceId,
        status: 'WAITING',
        amount: { value: paymentData.amount, currency: 'BRL' },
        links: [{
          rel: 'PAY',
          href: `https://sandbox.pagseguro.uol.com.br/pay/${mockId}`
        }],
        splits: paymentData.splits
      };
    }

    // Real PagSeguro API call
    const response = await fetch(`${this.apiUrl}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        reference_id: paymentData.referenceId,
        description: paymentData.description,
        amount: {
          value: paymentData.amount,
          currency: 'BRL'
        },
        payment_method: { type: 'PIX' },
        splits: paymentData.splits,
        notification_urls: [`${process.env.WEBHOOK_URL}/api/webhook`]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`PagSeguro API Error: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  getPaymentUrl(paymentResponse) {
    const payLink = paymentResponse.links?.find(link => link.rel === 'PAY');
    return payLink?.href || `https://sandbox.pagseguro.uol.com.br/pay/${paymentResponse.id}`;
  }

  generateWhatsAppLink(phone, paymentUrl, patientName, therapistName, amount) {
    const message = encodeURIComponent(
      `🏥 *Clínica Terapia*
Sessão agendada! ✅

👤 *Paciente:* ${patientName}
👨‍⚕️ *Terapeuta:* ${therapistName}
💰 *Valor:* ${amount}

💳 *PAGAMENTO PIX:*
${paymentUrl}

👆 *CLIQUE NO LINK ACIMA*
✅ Abre direto no seu PIX
⚡ Pagamento instantâneo

_Obrigado!_ 💙`
    );
    return `https://wa.me/${phone}?text=${message}`;
  }

  formatAmount(amountInCents) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }
}

const pagSeguro = new PagSeguroService();

// ============ API ROUTES ============

// Create therapist (register recipient with PagSeguro)
app.post('/api/therapist', async (req, res) => {
  try {
    const { name, email, cpf, pixKey, sharePercentage = 90 } = req.body;
    
    console.log('Creating therapist:', { name, email, pixKey });

    // Create recipient in PagSeguro
    const recipient = await pagSeguro.createRecipient({ name, email, cpf, pixKey });
    
    // Store in memory
    const therapistId = `therapist_${Date.now()}`;
    therapists.set(therapistId, {
      id: therapistId,
      name,
      email,
      pixKey,
      recipientId: recipient.id,
      sharePercentage
    });

    res.json({
      success: true,
      therapist: {
        id: therapistId,
        name,
        recipientId: recipient.id,
        status: 'ACTIVE'
      }
    });

  } catch (error) {
    console.error('Error creating therapist:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create PIX payment with split
app.post('/api/payment', async (req, res) => {
  try {
    const { 
      therapistId, 
      patientName, 
      patientPhone, 
      amount = 100 // Default R$ 1.00 in cents
    } = req.body;

    const therapist = therapists.get(therapistId);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }

    // Calculate split amounts
    const therapistAmount = Math.floor(amount * therapist.sharePercentage / 100);
    const platformAmount = amount - therapistAmount;

    const paymentData = {
      referenceId: `test_${Date.now()}`,
      description: `Sessão - ${therapist.name}`,
      amount,
      splits: [
        {
          recipient_id: therapist.recipientId,
          amount: therapistAmount,
          liable: true
        },
        {
          amount: platformAmount // Platform fee (goes to main account)
        }
      ]
    };

    console.log('Creating split payment:', paymentData);

    // Create payment with PagSeguro
    const payment = await pagSeguro.createSplitPayment(paymentData);
    
    // Store in memory
    payments.set(payment.id, {
      id: payment.id,
      referenceId: payment.reference_id,
      status: payment.status,
      amount,
      therapistId,
      patientName,
      patientPhone,
      created: new Date().toISOString(),
      splits: {
        therapist: therapistAmount,
        platform: platformAmount
      }
    });

    const paymentUrl = pagSeguro.getPaymentUrl(payment);
    
    // Generate WhatsApp link if phone provided
    let whatsappLink = null;
    if (patientPhone) {
      whatsappLink = pagSeguro.generateWhatsAppLink(
        patientPhone,
        paymentUrl,
        patientName,
        therapist.name,
        pagSeguro.formatAmount(amount)
      );
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: pagSeguro.formatAmount(amount),
        paymentUrl,
        whatsappLink,
        splits: {
          therapist: pagSeguro.formatAmount(therapistAmount),
          platform: pagSeguro.formatAmount(platformAmount)
        }
      }
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post('/api/webhook', (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Always respond quickly
  res.status(200).send('OK');

  // Log webhook for debugging
  webhookLogs.push({
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  });

  // Process webhook
  try {
    const { id, reference_id, status } = req.body;
    
    if (payments.has(id)) {
      const payment = payments.get(id);
      payment.status = status;
      payment.updated = new Date().toISOString();
      
      console.log(`Payment ${id} status updated to: ${status}`);
      
      if (status === 'PAID') {
        console.log(`✅ Payment confirmed! Therapist and platform both received their splits.`);
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

// Test webhook (simulate payment confirmation)
app.post('/api/test-webhook', (req, res) => {
  const { paymentId, status = 'PAID' } = req.body;
  
  if (!payments.has(paymentId)) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  // Simulate webhook
  const mockWebhook = {
    id: paymentId,
    reference_id: payments.get(paymentId).referenceId,
    status
  };

  // Process it
  const payment = payments.get(paymentId);
  payment.status = status;
  payment.updated = new Date().toISOString();

  webhookLogs.push({
    timestamp: new Date().toISOString(),
    type: 'TEST',
    body: mockWebhook
  });

  res.json({ 
    success: true, 
    message: `Payment ${paymentId} marked as ${status}`,
    payment 
  });
});

// Get payment status
app.get('/api/payment/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json({ payment });
});

// List all data (for debugging)
app.get('/api/debug', (req, res) => {
  res.json({
    therapists: Array.from(therapists.values()),
    payments: Array.from(payments.values()),
    webhookLogs: webhookLogs.slice(-10) // Last 10 logs
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PIX Test Server running at http://localhost:${PORT}`);
  console.log(`📱 Test the app at: http://localhost:${PORT}`);
  console.log(`🔗 Webhook URL: ${process.env.WEBHOOK_URL}/api/webhook`);
});