// src/components/payments/modals/CancelConfirmationModal.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BillingSummary } from '../../../types/calendar-only';

interface CancelConfirmationModalProps {
  visible: boolean;
  patient: BillingSummary | null;
  selectedMonth: number;
  selectedYear: number;
  onCancel: () => void;
  onConfirm: (patient: BillingSummary) => Promise<void>;
  formatCurrency: (amountInCents: number) => string;
}

export const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
  visible,
  patient,
  selectedMonth,
  selectedYear,
  onCancel,
  onConfirm,
  formatCurrency
}) => {
  if (!visible || !patient) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.cancelConfirmationModal}>
          <Text style={styles.formTitle}>⚠️ Cancelar Cobrança</Text>
          
          <Text style={styles.cancelWarningText}>
            Tem certeza que deseja cancelar a cobrança de{' '}
            <Text style={styles.patientNameBold}>{patient.patientName}</Text>?
          </Text>
          
          <Text style={styles.cancelDetailsText}>
            Isso irá remover o período de cobrança e permitir reprocessar as sessões.
          </Text>
          
          <View style={styles.cancelSummary}>
            <Text style={styles.cancelSummaryText}>
              📅 Período: {selectedMonth}/{selectedYear}
            </Text>
            <Text style={styles.cancelSummaryText}>
              📊 Sessões: {patient.sessionCount}
            </Text>
            <Text style={styles.cancelSummaryText}>
              💰 Valor: {formatCurrency(patient.totalAmount)}
            </Text>
          </View>

          <View style={styles.cancelActions}>
            <Pressable
              style={[styles.actionButton, styles.cancelModalCancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelModalCancelButtonText}>Não, Manter</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.cancelModalConfirmButton]}
              onPress={async () => {
                await onConfirm(patient);
                onCancel();
              }}
            >
              <Text style={styles.cancelModalConfirmButtonText}>🗑️ Sim, Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  cancelConfirmationModal: {
    padding: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  cancelWarningText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#495057',
    lineHeight: 24,
  },
  patientNameBold: {
    fontWeight: 'bold',
    color: '#212529',
  },
  cancelDetailsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  cancelSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  cancelSummaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
  },
  cancelActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelModalCancelButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    flex: 1,
    maxWidth: 140,
  },
  cancelModalCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelModalConfirmButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
    flex: 1,
    maxWidth: 140,
  },
  cancelModalConfirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});