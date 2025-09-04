# NFS-e Integration Plan - LV Notas + PlugNotas

## 🎯 Project Overview

Integrate automated NFS-e (Nota Fiscal de Serviços eletrônica) invoice generation into the LV Notas therapy practice management system using PlugNotas API. After therapy session payments are confirmed, therapists can click a button to automatically generate and submit invoices to São Paulo's municipal system.

## 🏗️ Architecture Decision

**Chosen Approach:** Each therapist uses their own company credentials and digital certificates
- **Why:** Legal compliance, clean separation of tax responsibilities, professional independence
- **Service:** PlugNotas API for automated certificate management and municipal integration
- **Certificate Storage:** Encrypted on our servers for automated invoice generation

## 📋 Technical Implementation Plan

### Phase 1: Database Schema Updates (30 minutes)

**File:** `clinic-api/db/nfse_schema.sql`

```sql
-- Add NFS-e fields to therapists table
ALTER TABLE therapists ADD COLUMN 
  certificate_file_path VARCHAR(255),
  certificate_password_encrypted TEXT,
  certificate_expires_at TIMESTAMP,
  certificate_status VARCHAR(20) DEFAULT 'pending', 
  plugnotas_company_id VARCHAR(100),
  nfse_settings JSONB;

-- Create invoice tracking table
CREATE TABLE nfse_invoices (
  id SERIAL PRIMARY KEY,
  therapist_id INTEGER REFERENCES therapists(id),
  session_id INTEGER REFERENCES sessions(id),
  plugnotas_invoice_id VARCHAR(100),
  invoice_number VARCHAR(50),
  invoice_amount DECIMAL(10,2),
  invoice_status VARCHAR(20),
  pdf_url TEXT,
  xml_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX idx_nfse_invoices_therapist ON nfse_invoices(therapist_id);
CREATE INDEX idx_nfse_invoices_session ON nfse_invoices(session_id);
```

### Phase 2: PlugNotas Service Layer (3 hours)

**File:** `clinic-api/src/services/plugnotas.ts`

```typescript
// clinic-api/src/services/plugnotas.ts
export class PlugNotasService {
  // Company registration with PlugNotas
  async registerCompany(therapistData, certificate, password): Promise<string>
  
  // Generate NFS-e invoice
  async generateInvoice(companyId, sessionData, certificate): Promise<InvoiceResult>
  
  // Check invoice status
  async getInvoiceStatus(invoiceId): Promise<InvoiceStatus>
  
  // Validate certificate
  async validateCertificate(certificate, password): Promise<boolean>
}
```

**Key Features:**
- Automated company registration via API
- Certificate validation before storage
- Invoice generation with session data
- Error handling and retry logic
- Webhook support for status updates

### Phase 3: Backend API Routes (4 hours)

**Files to create/update:**

1. **Certificate Management**
   - `POST /api/therapist/certificate` - Upload and validate certificate
   - `GET /api/therapist/certificate/status` - Check certificate validity
   - `DELETE /api/therapist/certificate` - Remove certificate

2. **NFS-e Invoice Operations**
   - `POST /api/nfse/test-invoice` - Generate sandbox test invoice
   - `POST /api/nfse/generate` - Generate production invoice
   - `GET /api/nfse/invoices` - List therapist's invoices
   - `GET /api/nfse/invoice/:id/pdf` - Download invoice PDF

3. **Company Registration**
   - `POST /api/nfse/register-company` - Register with PlugNotas (automated)
   - `PUT /api/nfse/company-settings` - Update tax settings

### Phase 4: Frontend Settings Updates (2 hours)

**File:** `src/components/Settings.tsx`

**New NFS-e Configuration Section:**
```typescript
interface NFSeSettings {
  certificateUploaded: boolean;
  certificateExpiresAt: Date;
  companyRegistered: boolean;
  serviceCode: string;
  taxRate: number;
  serviceDescription: string;
}
```

**UI Components:**
- Certificate upload with drag-and-drop
- Certificate status indicator (valid/expired/invalid)
- Company registration status
- Tax configuration (ISS rate, service codes)
- Test invoice generation button

### Phase 5: Payment Integration (1.5 hours)

**File:** `src/components/payments/PaymentsOverview.tsx`

**Enhanced Payment Workflow:**
1. Session payment confirmed → Show "Generate Invoice" button
2. Click button → Validate certificate → Generate invoice
3. Show invoice status → Provide PDF download link
4. Track invoice in payment history

**UI Changes:**
- "🧾 Gerar NFS-e" button on paid sessions
- Invoice status badges
- PDF download links
- Invoice generation progress indicators

### Phase 6: Dashboard Testing Interface (30 minutes)

**File:** `src/components/dashboard/Dashboard.tsx`

**NFS-e Testing Section:**
- Certificate upload test
- Sandbox invoice generation
- PlugNotas connection test
- Certificate expiration warnings

### Phase 7: Security Implementation (2 hours)

**Security Measures:**
- Certificate encryption at rest (AES-256)
- Password encryption with separate keys
- Secure file storage with access logging
- Certificate expiration monitoring
- API rate limiting for invoice generation

**Files:**
- `clinic-api/src/utils/encryption.ts` - Certificate encryption utilities
- `clinic-api/src/middleware/certificate-auth.ts` - Certificate access control

## 🔐 Data Models

### Therapist NFS-e Configuration
```typescript
interface TherapistNFSeConfig {
  // Certificate management
  certificateFilePath: string;
  certificatePasswordEncrypted: string;
  certificateExpiresAt: Date;
  certificateStatus: 'pending' | 'active' | 'expired' | 'invalid';
  
  // PlugNotas integration
  plugnotasCompanyId: string;
  
  // Tax configuration
  serviceCode: string; // Municipal code for therapy services
  taxRate: number; // ISS rate (2-5% typically)
  serviceDescription: string;
  
  // Company details
  cnpj: string;
  companyName: string;
  municipalRegistration?: string;
  stateRegistration?: string;
}
```

### Invoice Tracking
```typescript
interface NFSeInvoice {
  id: number;
  therapistId: number;
  sessionId: number;
  plugnotasInvoiceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceStatus: 'pending' | 'issued' | 'cancelled' | 'error';
  pdfUrl: string;
  xmlUrl: string;
  createdAt: Date;
}
```

## 🚀 Implementation Timeline

### Sprint 1 (Week 1): Foundation
- [x] Database schema updates
- [x] PlugNotas service basic structure
- [x] Certificate upload API endpoint
- [x] Settings UI for certificate upload

### Sprint 2 (Week 2): Core Functionality
- [x] Company registration automation
- [x] Test invoice generation
- [x] Basic error handling
- [x] Dashboard testing interface

### Sprint 3 (Week 3): Payment Integration
- [x] Payment system integration
- [x] Invoice generation buttons
- [x] Status tracking and display
- [x] PDF download functionality

### Sprint 4 (Week 4): Production Ready
- [x] Security hardening
- [x] Error handling and retry logic
- [x] Certificate expiration monitoring
- [x] Production testing and deployment

## 💰 Cost Analysis

### PlugNotas Pricing (Estimated)
- **Sandbox:** Free for testing
- **Production:** ~R$29-49/month for low volume
- **Per Invoice:** ~R$0.15-0.30 per NFS-e generated
- **Setup:** No setup fees

### Development Time Investment
- **Total:** ~12-13 hours of development
- **ROI:** Automated invoicing saves 5-10 minutes per session
- **Break-even:** ~20-30 invoices per month

## 🔧 Environment Configuration

### Backend Environment Variables
```bash
# PlugNotas API
PLUGNOTAS_API_KEY=your_plugnotas_api_key
PLUGNOTAS_API_URL=https://api.plugnotas.com.br
PLUGNOTAS_SANDBOX=true # Set to false for production

# Certificate Storage
CERTIFICATE_STORAGE_PATH=/secure/certificates/
CERTIFICATE_ENCRYPTION_KEY=your_encryption_key
```

### Frontend Environment Variables
```bash
# Feature flags
EXPO_PUBLIC_NFSE_ENABLED=true
```

## 📝 User Journey

### Therapist Onboarding
1. **Account Creation** → Standard LV Notas registration
2. **Certificate Upload** → Settings → NFS-e → Upload .p12/.pfx file + password
3. **Automatic Registration** → System registers company with PlugNotas
4. **Configuration** → Set tax rates, service descriptions
5. **Testing** → Generate test invoice in sandbox
6. **Go Live** → Switch to production mode

### Daily Usage
1. **Session Completed** → Mark payment as received
2. **Generate Invoice** → Click "🧾 Gerar NFS-e" button
3. **Automatic Processing** → System generates and submits invoice
4. **Download PDF** → Therapist receives invoice PDF
5. **Patient Communication** → Send invoice to patient

## 🔍 Testing Strategy

### Test Scenarios
1. **Certificate Validation** → Upload valid/invalid certificates
2. **Company Registration** → Automated PlugNotas registration
3. **Sandbox Invoices** → Generate test invoices with sample data
4. **Error Handling** → Network failures, invalid data, expired certificates
5. **Security Testing** → Certificate encryption, access control
6. **Integration Testing** → End-to-end payment → invoice flow

### Test Data
- Sample therapy session data
- Valid test certificates (A1 format)
- Various tax scenarios (different rates, service codes)
- Error conditions (expired certificates, invalid CNPJ)

## 🚨 Risk Mitigation

### Technical Risks
- **Certificate Expiration** → Automated monitoring and alerts
- **PlugNotas API Changes** → Version pinning and change monitoring
- **Municipal System Updates** → PlugNotas handles compatibility
- **Security Breaches** → Encrypted storage and access logging

### Business Risks
- **Compliance Issues** → Each therapist responsible for their own taxes
- **Service Costs** → Transparent pricing with usage monitoring
- **User Adoption** → Progressive onboarding with clear benefits
- **Support Complexity** → Comprehensive documentation and testing

## 📚 Documentation Plan

### User Documentation
- Certificate acquisition guide
- Step-by-step setup instructions
- Troubleshooting common issues
- Tax compliance best practices

### Technical Documentation
- API endpoint documentation
- Database schema reference
- Security implementation details
- Deployment and maintenance guides

## 🎯 Success Metrics

### Technical Metrics
- Certificate upload success rate (target: >95%)
- Invoice generation success rate (target: >98%)
- Average invoice generation time (target: <30 seconds)
- System uptime (target: 99.9%)

### Business Metrics
- Therapist adoption rate (target: >80% of active users)
- Time saved per invoice (target: 5-10 minutes)
- User satisfaction score (target: >4.5/5)
- Support ticket volume (target: <5% of invoices)

## 📞 Next Steps

1. **Immediate:** Database schema implementation
2. **This Week:** PlugNotas service development
3. **Next Week:** Frontend integration and testing
4. **Following Week:** Security review and production deployment

---

**Contact:** Development team for implementation questions
**Documentation:** This plan will be updated as implementation progresses
**Version:** 1.0 - Initial implementation plan