// src/components/payments/index.ts

// Export all payment components for easy importing
export { PaymentsOverview } from './PaymentsOverview';
export { PaymentFilters } from './PaymentFilters';
export { PaymentSummaryCards } from './PaymentSummaryCards';
export { PaymentStatusBadge } from './PaymentStatusBadge';
export { PaymentActionButton } from './PaymentActionButton';
export { PatientPaymentCard } from './PatientPaymentCard';
export { SessionPaymentCard } from './SessionPaymentCard';

// Re-export payment types for convenience
export type {
  PatientPaymentSummary,
  SessionPaymentDetail,
  PaymentsSummary,
  PaymentStatus,
  PaymentStatusFilter,
  ViewType,
  QuickFilterType,
  PaymentStatusDetails,
  PaymentFiltersState,
  PaymentActionHandlers
} from '../../types/payments';