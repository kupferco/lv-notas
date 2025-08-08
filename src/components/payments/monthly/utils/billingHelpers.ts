// src/components/payments/monthly/utils/billingHelpers.ts

import { BillingSummary } from '../../../../types/calendar-only';
import { CertificateStatus } from '../../../../services/api/nfse-service';

export const shouldShowNFSeButton = (
  patient: BillingSummary,
  certificateStatus: CertificateStatus | null,
  generatedInvoices: Set<number>
): boolean => {
  // Only show for paid patients
  if (patient.status !== 'paid') return false;

  // Only show if certificate is valid
  if (!certificateStatus?.hasValidCertificate) return false;

  // Don't show if already generated for this patient
  if (generatedInvoices.has(patient.patientId)) return false;

  return true;
};

export const createExportFilename = (year: number, month: number): string => {
  return `cobranca-mensal-${year}-${month.toString().padStart(2, '0')}.xlsx`;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};