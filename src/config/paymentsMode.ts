// src/config/paymentsMode.ts

export type PaymentMode = 'simple' | 'advanced';

export const config = {
  // Payment Mode Configuration
  paymentMode: 'advanced' as PaymentMode, // Change to 'simple' to enable simple mode
};

// Payment mode utility functions
export const isSimpleMode = () => config.paymentMode === 'simple';
export const isAdvancedMode = () => config.paymentMode === 'advanced';

// Status mappings for different modes
export const getStatusMapping = () => {
  if (isSimpleMode()) {
    return {
      // Simple mode: Map all non-paid statuses to 'pending'
      'pending': 'pending',           // Não Cobrado -> Pending
      'aguardando_pagamento': 'pending', // Aguardando -> Pending  
      'pendente': 'pending',          // Pendente -> Pending
      'paid': 'paid'                  // Pago -> Paid
    };
  } else {
    return {
      // Advanced mode: Keep all statuses as-is
      'pending': 'pending',
      'aguardando_pagamento': 'aguardando_pagamento',
      'pendente': 'pendente', 
      'paid': 'paid'
    };
  }
};

// Get available status options for dropdowns
export const getStatusOptions = () => {
  if (isSimpleMode()) {
    return [
      { label: '○ Pendente', value: 'pending', icon: '○' },
      { label: '✓ Pago', value: 'paid', icon: '✓' }
    ];
  } else {
    return [
      { label: '○ Não Cobrado', value: 'pending', icon: '○' },
      { label: '⏳ Aguardando', value: 'aguardando_pagamento', icon: '⏳' },
      { label: '⚠️ Pendente', value: 'pendente', icon: '⚠️' },
      { label: '✓ Pago', value: 'paid', icon: '✓' }
    ];
  }
};

// Get display label for status
export const getStatusDisplayLabel = (status: string) => {
  if (isSimpleMode()) {
    const mapping = getStatusMapping();
    const mappedStatus = mapping[status as keyof typeof mapping];
    return mappedStatus === 'paid' ? 'Pago' : 'Pendente';
  } else {
    switch (status) {
      case 'paid': return 'Pago';
      case 'aguardando_pagamento': return 'Aguardando';
      case 'pendente': return 'Pendente';
      case 'pending': 
      default: return 'Não Cobrado';
    }
  }
};