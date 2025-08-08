// src/components/payments/modals/PaymentFormModal.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BillingSummary } from '../../../types/calendar-only';

interface PaymentFormModalProps {
  visible: boolean;
  patient: BillingSummary | null;
  paymentFormData: {
    amount: string;
    paymentMethod: 'pix' | 'transferencia' | 'dinheiro' | 'cartao';
    paymentDate: string;
    referenceNumber: string;
  };
  onPaymentFormDataChange: (data: any) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  visible,
  patient,
  paymentFormData,
  onPaymentFormDataChange,
  onCancel,
  onSubmit
}) => {
  if (!visible || !patient) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.paymentForm}>
          <Text style={styles.formTitle}>
            Registrar Pagamento - {patient.patientName}
          </Text>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Valor (R$)</Text>
            <input
              type="number"
              step="0.01"
              value={paymentFormData.amount}
              onChange={(e) => onPaymentFormDataChange({ 
                ...paymentFormData, 
                amount: e.target.value 
              })}
              style={styles.formInput as any}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Método de Pagamento</Text>
            <select
              value={paymentFormData.paymentMethod}
              onChange={(e) => onPaymentFormDataChange({ 
                ...paymentFormData, 
                paymentMethod: e.target.value as any 
              })}
              style={styles.formSelect as any}
            >
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
            </select>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Data do Pagamento</Text>
            <input
              type="date"
              value={paymentFormData.paymentDate}
              onChange={(e) => onPaymentFormDataChange({ 
                ...paymentFormData, 
                paymentDate: e.target.value 
              })}
              style={styles.formInput as any}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Referência (opcional)</Text>
            <input
              type="text"
              placeholder="ID da transação, número do comprovante..."
              value={paymentFormData.referenceNumber}
              onChange={(e) => onPaymentFormDataChange({ 
                ...paymentFormData, 
                referenceNumber: e.target.value 
              })}
              style={styles.formInput as any}
            />
          </View>

          <View style={styles.formActions}>
            <Pressable
              style={[styles.actionButton, styles.cancelFormButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelFormButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.saveFormButton]}
              onPress={onSubmit}
            >
              <Text style={styles.saveFormButtonText}>Registrar Pagamento</Text>
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
  paymentForm: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  formInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
    width: '100%',
  },
  formSelect: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 14,
    width: '100%',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelFormButton: {
    backgroundColor: '#6c757d',
    flex: 1,
    marginRight: 8,
  },
  cancelFormButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveFormButton: {
    backgroundColor: '#28a745',
    flex: 1,
    marginLeft: 8,
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});