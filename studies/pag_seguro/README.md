# PIX Payment Test App - PagSeguro Integration

A minimal test application to test PagSeguro PIX payment flow with split payments and WhatsApp integration.

## 🎯 What This App Tests

1. **Therapist Registration** - Register therapists with PagSeguro as payment recipients
2. **Split Payments** - Create payments that automatically split between therapist and platform
3. **WhatsApp Integration** - Generate clickable WhatsApp links with payment URLs
4. **Webhook Handling** - Receive and process payment confirmations
5. **Complete Flow** - Test entire payment lifecycle

## 🚀 Quick Setup

### 1. Create Project Directory
```bash
mkdir pix-test-app
cd pix-test-app
```

### 2. Create Files
Create these files in your project directory:

- `package.json` (copy from artifact)
- `server.js` (copy from artifact)
- `.env` (copy from artifact and update when you have credentials)
- Create `public/` folder and put `index.html` inside it

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Server
```bash
npm run dev
```

### 5. Open Browser
Visit: http://localhost:3000

## 📱 Testing Flow

### Step 1: Register Therapist
1. Fill in therapist details (use test data provided)
2. Click "Register Therapist"
3. Note the PagSeguro Recipient ID created

### Step 2: Create Payment  
1. Select the registered therapist
2. Enter patient details
3. Set amount (100 = R$ 1.00)
4. Add WhatsApp number (5511999999999)
5. Click "Create PIX Payment"

### Step 3: Test Payment
1. Copy the Payment ID
2. Click "Simulate Payment Success"
3. Watch the split happen automatically

### Step 4: WhatsApp Test
1. Click the "Open WhatsApp Link" button
2. See the formatted message with payment link
3. Payment link should be clickable in WhatsApp

## 🔧 Configuration

### Environment Variables (.env)
```env
PAGSEGURO_API_URL=https://ws.riodoce.pagseguro.uol.com.br
PAGSEGURO_TOKEN=your_real_token_here
PAGSEGURO_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
WEBHOOK_URL=http://localhost:3000
NODE_ENV=development
```

### When You Get Real Credentials
1. Replace `PAGSEGURO_TOKEN` with your real sandbox token
2. Update `WEBHOOK_URL` to your ngrok URL
3. The app will automatically switch from mock to real API calls

## 🌐 Webhook Testing with ngrok

### Install ngrok
```bash
npm install -g ngrok
```

### Create tunnel
```bash
ngrok http 3000
```

### Update .env
```env
WEBHOOK_URL=https://your-ngrok-url.ngrok.io
```

## 📊 API Endpoints

- `POST /api/therapist` - Register therapist with PagSeguro
- `POST /api/payment` - Create split PIX payment
- `POST /api/webhook` - Receive PagSeguro webhooks
- `POST /api/test-webhook` - Simulate webhook for testing
- `GET /api/payment/:id` - Get payment status
- `GET /api/debug` - View all test data

## 💡 Key Features Tested

### ✅ Split Payments
- Therapist automatically receives 90% (R$ 0.90 from R$ 1.00)
- Platform automatically receives 10% (R$ 0.10 from R$ 1.00)
- No manual transfers needed

### ✅ WhatsApp Integration
- Generates properly formatted messages
- Embeds payment links in message body
- Links are clickable and open banking apps

### ✅ Mock Development Mode
- Works without real PagSeguro credentials
- Simulates complete payment flow
- Enables full testing of your logic

### ✅ Real API Ready
- Simply add credentials to switch to real mode
- No code changes needed
- Webhook handling ready

## 🔍 Debug Features

- View all registered therapists
- See payment history and splits
- Monitor webhook logs
- Test payment status changes
- Clear all test data

## 🎯 Next Steps

Once you have real PagSeguro credentials:

1. Update `.env` with real token
2. Set up ngrok for webhook URL
3. Test with real R$ 1.00 payments
4. Integrate into your main clinic app

## 🚨 Important Notes

- This is for **testing only** - use sandbox environment
- All data is stored in memory (resets on server restart)
- WhatsApp links are generated but not automatically sent
- Webhook signature verification is simplified for testing

## 📞 Support

If you encounter issues:
1. Check the debug panel for detailed logs
2. Verify your `.env` configuration
3. Ensure ngrok is running for webhook testing
4. Check browser console for frontend errors