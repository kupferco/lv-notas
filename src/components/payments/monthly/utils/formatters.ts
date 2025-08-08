// src/components/payments/monthly/utils/formatters.ts

export const formatCurrency = (amountInCents: number): string => {
  return `R$ ${(amountInCents / 100).toFixed(2).replace('.', ',')}`;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'can_process': return '#007bff';
    case 'processed': return '#ffc107';
    case 'paid': return '#28a745';
    case 'void': return '#6c757d';
    default: return '#495057';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'can_process': return 'Pode Processar';
    case 'processed': return 'Processado';
    case 'paid': return 'Pago';
    case 'void': return 'Cancelado';
    default: return status;
  }
};