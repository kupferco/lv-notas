// src/types/payments.ts

// Core payment data interfaces
export interface PatientPaymentSummary {
  patient_id: number;
  patient_name: string;
  total_sessions: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  billing_cycle: string;
  last_session_date: string;
  payment_requested: boolean;
  payment_request_date?: string;
  last_payment_date?: string;
  payment_methods?: string;
  payment_count: number;
  pendente_sessions: number;
  aguardando_sessions: number;
  nao_cobrado_sessions: number;
  paid_sessions: number;
}

export interface SessionPaymentDetail {
  session_id: number;
  session_date: string;
  patient_name: string;
  patient_id: number;
  session_price: number;
  payment_status: 'paid' | 'pending' | 'overdue';
  days_since_session: number;
}

export interface PaymentsSummary {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  nao_cobrado_revenue: number;
  aguardando_revenue: number;
  pendente_revenue: number;
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
}

// Payment status and UI state types
export type PaymentStatus = 'pago' | 'nao_cobrado' | 'aguardando_pagamento' | 'pendente' | 'parcialmente_pago' | 'parcialmente_pago_pendente' | 'parcialmente_pago_aguardando';

export type PaymentStatusFilter = 'todos' | 'nao_cobrado' | 'aguardando_pagamento' | 'pago' | 'pendente' | 'parcialmente_pago' | 'parcialmente_pago_pendente' | 'parcialmente_pago_aguardando';

export type ViewType = 'patient' | 'session';

export type QuickFilterType = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months';

export interface PaymentStatusDetails {
  status: PaymentStatus;
  color: string;
  text: string;
  showButton: boolean;
  buttonText: string;
  buttonType: 'invoice' | 'reminder' | '';
  displayAmount: string;
  amountLabel: string;
}

// Filter and date range interfaces
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PaymentFiltersState {
  dateRange: DateRange;
  quickFilter: QuickFilterType;
  statusFilter: PaymentStatusFilter;
  viewType: ViewType;
}

// Action handlers and callbacks
export interface PaymentActionHandlers {
  onSendPaymentRequest: (patient: PatientPaymentSummary) => Promise<void>;
  onChasePayment: (patient: PatientPaymentSummary) => Promise<void>;
  onStatusChange: (patientId: number, newStatus: string) => Promise<void>;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  onStatusFilterChange: (filter: PaymentStatusFilter) => void;
  onViewTypeChange: (viewType: ViewType) => void;
}

// Component props interfaces
export interface PaymentFiltersProps {
  filters: PaymentFiltersState;
  patients: { id: string; name: string }[]; // Change number to string
  onFiltersChange: Partial<PaymentActionHandlers>;
}

export interface PaymentSummaryCardsProps {
  summary: PaymentsSummary | null;
  loading?: boolean;
}

export interface ViewToggleProps {
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
}

export interface PatientPaymentCardProps {
  patient: PatientPaymentSummary;
  onSendPaymentRequest?: (patient: PatientPaymentSummary) => Promise<void>;
  onChasePayment?: (patient: PatientPaymentSummary) => Promise<void>;
  onStatusChange?: (patientId: number, newStatus: string) => Promise<void>;
  onViewDetails?: (patientId: number) => void;
}

export interface SessionPaymentCardProps {
  session: SessionPaymentDetail;
}

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  text: string;
  color: string;
}

export interface PaymentActionButtonProps {
  showButton: boolean;
  buttonText: string;
  buttonType: 'invoice' | 'reminder' | '';
  onPress: () => void;
  disabled?: boolean;
}

// WhatsApp integration types
export interface WhatsAppMessageTemplate {
  type: 'payment_request' | 'payment_reminder';
  message: string;
}

export interface WhatsAppLinkData {
  phone: string;
  message: string;
  formattedPhone: string;
  whatsappUrl: string;
}

// Configuration and constants
export interface PaymentConfig {
  PENDING_THRESHOLD_DAYS: number;
  DEFAULT_CURRENCY: string;
  CURRENCY_SYMBOL: string;
  DECIMAL_SEPARATOR: string;
  THOUSANDS_SEPARATOR: string;
}

// API response types (for future database integration)
export interface PaymentSummaryResponse {
  summary: PaymentsSummary;
  patients: PatientPaymentSummary[];
  sessions: SessionPaymentDetail[];
}

export interface PaymentRequestResponse {
  success: boolean;
  message: string;
  patient_id: number;
  request_date: string;
}

export interface PaymentStatusUpdateResponse {
  success: boolean;
  message: string;
  patient_id: number;
  new_status: PaymentStatus;
  updated_at: string;
}

// Update the PaymentActionHandlers to include all the new handlers
export interface PaymentActionHandlers {
  onQuickFilterChange: (filter: QuickFilterType) => void;
  onStatusFilterChange: (statusFilter: PaymentStatusFilter) => void;
  onPatientFilterChange: (patientId: string) => void;
  onViewTypeChange: (viewType: ViewType) => void;
}

// Update PaymentFiltersState to include patientFilter
export interface PaymentFiltersState {
  dateRange: { startDate: string; endDate: string };
  quickFilter: QuickFilterType;
  statusFilter: PaymentStatusFilter;
  patientFilter: string;
  viewType: ViewType;
}