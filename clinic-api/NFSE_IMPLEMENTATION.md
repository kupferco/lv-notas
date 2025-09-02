# Focus NFE Implementation Guide - Updated
*With simplified schema and invoice numbering system*

## Key Architecture Decisions

### 1. Minimal Database Storage
We only store:
- **CNPJ** - The only identifier needed
- **Invoice preferences** - Service codes, descriptions
- **Invoice counter** - For our LV-1, LV-2, LV-3... reference system
- **Invoice records** - For audit trail and future retrieval

Focus NFE stores:
- Company data (name, address, municipal registration)
- Digital certificates
- API tokens
- Certificate validation

### 2. Invoice Reference System

**Our Internal Reference**: `LV-1`, `LV-2`, `LV-3`...
- Sequential counter per therapist
- Stored in `therapist_nfse_config.next_invoice_ref`
- Used as Focus NFE's `ref` parameter
- Allows future retrieval via Focus NFE API

**Why this matters:**
- Focus NFE uses the `ref` parameter to prevent duplicates
- We can query Focus NFE later using: `/v2/nfse?ref=LV-123`
- Provides audit trail in our `nfse_invoices` table
- Simple, human-readable format

### 3. Company Registration Flow

When therapist provides CNPJ and uploads certificate in app:

```javascript
// 1. Auto-enable NFS-e in company.json
{
  "nome": "COMPANY_NAME",
  "cnpj": "00000000000000",
  "habilita_nfse": true,  // <-- Automatically set to true
  // ... other fields
}

// Note: Every therapist uploading a certificate wants NFS-e enabled
// No need for a separate toggle later
```

```javascript
// 2. Register/update company with Focus NFE
const registerCompany = async (cnpj) => {
  // Get company data from ReceitaWS
  const companyData = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  
  // Prepare Focus NFE payload
  const payload = {
    nome: companyData.razao_social,
    cnpj: cnpj, // Unformatted
    habilita_nfse: true, // Always true for therapists
    inscricao_municipal: therapistProvidedCCM, // Get from UI
    regime_tributario: companyData.simples.optante ? 1 : 3,
    logradouro: companyData.logradouro,
    numero: companyData.numero,
    bairro: companyData.bairro,
    municipio: companyData.municipio,
    uf: companyData.uf,
    cep: companyData.cep.replace(/\D/g, ''),
    codigo_municipio: getIBGECode(companyData.municipio, companyData.uf)
  };
  
  // Upsert to Focus NFE
  const response = await fetch('/v2/empresas', {
    method: 'POST',
    headers: { Authorization: `Basic ${masterToken}` },
    body: JSON.stringify(payload)
  });
  
  // Store only CNPJ in our database
  await saveTherapistNFSeConfig(therapistId, cnpj);
};
```

### 4. Invoice Generation Flow

```javascript
const generateInvoice = async (therapistId, billingPeriodId) => {
  // 1. Get therapist config
  const config = await getTherapistNFSeConfig(therapistId);
  
  // 2. Get next invoice reference
  const { ref, ref_number } = await getNextInvoiceRef(therapistId);
  // Returns: { ref: 'LV-123', ref_number: 123 }
  
  // 3. Get company token from Focus NFE
  const company = await focusNFE.getCompany(config.cnpj);
  const token = company.token_producao;
  
  // 4. Build invoice data
  const invoice = {
    data_emissao: new Date().toISOString().split('T')[0],
    prestador: {
      cnpj: config.cnpj,
      inscricao_municipal: company.inscricao_municipal,
      codigo_municipio: company.codigo_municipio
    },
    tomador: {
      cpf: patient.cpf, // or cnpj
      razao_social: patient.name,
      email: patient.email,
      endereco: { /* patient address */ }
    },
    servico: {
      codigo_tributario_municipio: config.default_service_code,
      item_lista_servico: config.default_item_lista_servico,
      discriminacao: buildDescription(sessions),
      valor_servicos: totalAmount,
      aliquota: config.default_tax_rate,
      iss_retido: false
    }
  };
  
  // 5. Send to Focus NFE with our reference
  const response = await fetch(`/v2/nfse?ref=${ref}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${token}` },
    body: JSON.stringify(invoice)
  });
  
  // 6. Store in our database for audit trail
  await saveInvoiceRecord({
    therapist_id: therapistId,
    internal_ref: ref,
    ref_number: ref_number,
    billing_period_id: billingPeriodId,
    focus_reference: ref,
    focus_response: response,
    // ... other fields
  });
  
  return { ref, response };
};
```

### 5. Invoice Retrieval

Since we store the reference, we can always retrieve invoices:

```javascript
const retrieveInvoice = async (internalRef) => {
  // 1. Get from our database (has basic info + URLs)
  const invoice = await getInvoiceByRef(internalRef);
  
  // 2. If needed, get fresh data from Focus NFE
  const company = await focusNFE.getCompany(invoice.cnpj);
  const focusInvoice = await fetch(`/v2/nfse?ref=${internalRef}`, {
    headers: { Authorization: `Basic ${company.token_producao}` }
  });
  
  // 3. Update our record with latest status
  await updateInvoiceRecord(internalRef, focusInvoice);
  
  return focusInvoice;
};
```

## Database Implementation

### Tables Needed

1. **therapist_nfse_config**
   - `cnpj` - The only company identifier needed
   - `next_invoice_ref` - Counter for LV-1, LV-2, LV-3...
   - Service defaults (code, rate, description)
   
2. **nfse_invoices** 
   - `internal_ref` - Our LV-123 reference
   - `ref_number` - The numeric part for ordering
   - `focus_reference` - What we sent to Focus (same as internal_ref)
   - Links to billing period
   - Patient snapshot
   - Focus NFE response data
   - Status tracking

### Why This Architecture?

1. **Simplicity**: Let Focus NFE handle the complex parts
2. **Audit Trail**: Every invoice is logged with our reference
3. **Retrievability**: Can always fetch invoices using the ref
4. **Flexibility**: Can switch providers without losing data
5. **Compliance**: Maintains required records for tax purposes

## Implementation Checklist

### Phase 1: Setup
- [ ] Get Focus NFE API credentials
- [ ] Create database tables (use simplified schema)
- [ ] Implement CNPJ lookup via ReceitaWS

### Phase 2: Company Registration
- [ ] Build UI for CNPJ + CCM input
- [ ] Add `habilita_nfse: true` automatically to company.json
- [ ] Implement certificate upload to Focus NFE
- [ ] Store only CNPJ in our database

### Phase 3: Invoice Generation  
- [ ] Implement `get_next_invoice_ref()` function
- [ ] Build invoice generation with LV-X reference
- [ ] Store complete invoice record for audit
- [ ] Handle retry logic for failures

### Phase 4: Invoice Management
- [ ] Implement invoice retrieval by reference
- [ ] Build UI to display invoice history
- [ ] Add PDF download functionality
- [ ] Email invoices to patients

## Key Points to Remember

1. **Always use `habilita_nfse: true`** when registering companies - therapists uploading certificates always want NFS-e
2. **Reference format**: LV-1, LV-2, LV-3... sequential per therapist
3. **Store invoice records**: Essential for audit trail and future retrieval
4. **CNPJ is enough**: Focus NFE handles everything else via CNPJ lookup
5. **Fetch tokens dynamically**: Never store tokens, always get fresh from API

## Error Recovery

If invoice generation fails:
1. The reference number is already incremented (that's ok)
2. Retry with a new reference (LV-124 if LV-123 failed)
3. Mark the failed one in our database with error status
4. Focus NFE prevents duplicates via the ref parameter

## API Examples & Commands

### Company Data Lookup

```bash
# Get company data from free ReceitaWS API
curl -X GET "https://receitaws.com.br/v1/cnpj/04479058000110"

# Manual CCM lookup for São Paulo
# Navigate to: https://ccm.prefeitura.sp.gov.br/login/contribuinte?tipo=F
```

### Focus NFE Production Commands

```bash
# Create/update company in PRODUCTION (real environment)
# Note: The colon after token means blank password
curl -u "masterToken:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @empresa_lugar_vida.json \
  "https://api.focusnfe.com.br/v2/empresas"

# Retrieve company's tokens (two ways)
# By CNPJ:
curl -u "masterToken:" \
  "https://api.focusnfe.com.br/v2/empresas?cnpj=04479058000110"

# Or by company ID:
curl -u "masterToken:" \
  "https://api.focusnfe.com.br/v2/empresas/149459"

# Enable NFSe (not needed if already enabled in initial JSON)
curl -u "masterToken:" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"habilita_nfse": true}' \
  "https://api.focusnfe.com.br/v2/empresas/149459"
```

### Focus NFE Testing Commands

```bash
# Create NFSe in sandbox/homologação environment
curl -u "companyToken:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @nfse_test.json \
  "https://homologacao.focusnfe.com.br/v2/nfse?ref=TESTE001&empresa_id=149459"

# Check invoice status
curl -u "companyToken:" \
  "https://homologacao.focusnfe.com.br/v2/nfse/TESTE001"
```

### Important Notes

- **Token format**: Always add `:` after the token to avoid password prompt
- **Master token**: Used for company management operations
- **Company token**: Used for invoice emission (get from company endpoint)
- **ReceitaWS**: Free API, no authentication needed
- **CCM lookup**: Manual process through São Paulo prefecture website

## Testing Strategy

1. Start with Focus NFE sandbox
2. Use test CNPJ: "00000000000191"
3. Include "TESTE - SEM VALOR FISCAL" in descriptions
4. Test the full flow:
   - Company registration
   - Certificate upload
   - Invoice generation with LV-X reference
   - Invoice retrieval by reference
5. Verify invoice appears in Focus NFE dashboard