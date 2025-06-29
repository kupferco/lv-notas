// src/components/payments/PatientPaymentList.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { PatientPaymentSummary } from '../../types/payments';
import { isSimpleMode } from '../../config/paymentsMode';

interface PatientPaymentListProps {
  patients: PatientPaymentSummary[];
  onViewDetails?: (patientId: number) => void;
  onSendPaymentRequest?: (patient: PatientPaymentSummary) => Promise<void>;
  onChasePayment?: (patient: PatientPaymentSummary) => Promise<void>;
}

export const PatientPaymentList: React.FC<PatientPaymentListProps> = ({
  patients,
  onViewDetails,
  onSendPaymentRequest,
  onChasePayment
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getPatientStatus = (patient: PatientPaymentSummary) => {
    if (isSimpleMode()) {
      // Simple mode logic
      if (patient.pending_amount === 0 && patient.paid_amount > 0) {
        return { status: 'pago', color: '#28a745', text: 'Pago' };
      }
      if (patient.paid_amount > 0 && patient.pending_amount > 0) {
        return { status: 'parcial', color: '#fd7e14', text: 'Parcial' };
      }
      return { status: 'pendente', color: '#dc3545', text: 'Pendente' };
    } else {
      // Advanced mode logic
      const hasPendingSessions = patient.pendente_sessions > 0;
      const hasAwaitingSessions = patient.aguardando_sessions > 0;

      if (patient.pending_amount === 0 && patient.paid_amount > 0) {
        return { status: 'pago', color: '#28a745', text: 'Pago' };
      }
      if (patient.paid_amount > 0 && patient.pending_amount > 0) {
        if (hasPendingSessions) {
          return { status: 'parcial_pendente', color: '#dc3545', text: 'Parcial - Pendente' };
        }
        if (hasAwaitingSessions) {
          return { status: 'parcial_aguardando', color: '#17a2b8', text: 'Parcial - Aguardando' };
        }
        return { status: 'parcial', color: '#ffc107', text: 'Parcial' };
      }
      if (hasPendingSessions) {
        return { status: 'pendente', color: '#dc3545', text: 'Pendente' };
      }
      if (hasAwaitingSessions) {
        return { status: 'aguardando', color: '#ffc107', text: 'Aguardando' };
      }
      return { status: 'nao_cobrado', color: '#6c757d', text: 'Não Cobrado' };
    }
  };

  const handleActionPress = async (patient: PatientPaymentSummary) => {
    const status = getPatientStatus(patient);
    
    console.log(`🔘 Action button pressed for ${patient.patient_name}, status: ${status.status}`);
    
    if (status.status.includes('pendente') && onChasePayment) {
      console.log(`📝 Calling onChasePayment for ${patient.patient_name}`);
      await onChasePayment(patient);
    } else if (onSendPaymentRequest) {
      console.log(`💰 Calling onSendPaymentRequest for ${patient.patient_name}`);
      await onSendPaymentRequest(patient);
    } else {
      console.log(`⚠️ No handler available for ${patient.patient_name}`);
      alert('Função não disponível no momento.');
    }
  };

  const getActionButtonText = (patient: PatientPaymentSummary) => {
    const status = getPatientStatus(patient);
    
    if (status.status.includes('pendente')) {
      return '📝';
    }
    if (status.status === 'pago') {
      return '✓';
    }
    return '💰';
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.nameColumn]}>Paciente</Text>
        <Text style={[styles.headerCell, styles.sessionsColumn]}>Sessões</Text>
        <Text style={[styles.headerCell, styles.totalColumn]}>Total</Text>
        <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
        <Text style={[styles.headerCell, styles.actionColumn]}>Ação</Text>
      </View>

      {/* Data Rows */}
      <ScrollView style={styles.scrollContainer}>
        {patients.map((patient) => {
          const status = getPatientStatus(patient);
          
          return (
            <View key={patient.patient_id} style={styles.dataRow}>
              {/* Patient Name & Date */}
              <View style={[styles.dataCell, styles.nameColumn]}>
                <Text style={styles.patientName} numberOfLines={1}>
                  {patient.patient_name}
                </Text>
                <Text style={styles.lastSession}>
                  {formatDate(patient.last_session_date)}
                </Text>
              </View>

              {/* Sessions Count */}
              <View style={[styles.dataCell, styles.sessionsColumn]}>
                <Text style={styles.sessionCount}>{patient.total_sessions}</Text>
                {patient.paid_amount > 0 && (
                  <Text style={styles.paidInfo}>
                    {patient.paid_sessions}p
                  </Text>
                )}
              </View>

              {/* Total Amount */}
              <View style={[styles.dataCell, styles.totalColumn]}>
                <Text style={styles.totalAmount}>
                  {formatCurrency(patient.total_amount)}
                </Text>
                {patient.pending_amount > 0 && (
                  <Text style={styles.pendingAmount}>
                    -{formatCurrency(patient.pending_amount)}
                  </Text>
                )}
              </View>

              {/* Status */}
              <View style={[styles.dataCell, styles.statusColumn]}>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20', borderColor: status.color }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={[styles.dataCell, styles.actionColumn]}>
                <View style={styles.actionButtons}>
                  {/* Action Button */}
                  {(onSendPaymentRequest || onChasePayment) && status.status !== 'pago' && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        console.log(`🔘 Button pressed for patient ${patient.patient_name}`);
                        handleActionPress(patient);
                      }}
                    >
                      <Text style={styles.actionButtonText}>
                        {getActionButtonText(patient)}
                      </Text>
                    </Pressable>
                  )}
                  
                  {/* Details Button */}
                  <Pressable
                    style={styles.detailsButton}
                    onPress={() => {
                      console.log(`📋 Details button pressed for patient ${patient.patient_name}`);
                      onViewDetails?.(patient.patient_id);
                    }}
                  >
                    <Text style={styles.detailsButtonText}>📋</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  scrollContainer: {
    maxHeight: 400, // Limit height to prevent excessive scrolling
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
    minHeight: 50,
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // Column widths
  nameColumn: {
    flex: 3,
  },
  sessionsColumn: {
    flex: 1.5,
    alignItems: 'center',
  },
  totalColumn: {
    flex: 2,
    alignItems: 'center',
  },
  statusColumn: {
    flex: 2,
    alignItems: 'center',
  },
  actionColumn: {
    flex: 1.5,
    alignItems: 'center',
  },
  // Data cell content
  patientName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  lastSession: {
    fontSize: 10,
    color: '#6c757d',
  },
  sessionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  paidInfo: {
    fontSize: 9,
    color: '#28a745',
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  pendingAmount: {
    fontSize: 10,
    color: '#dc3545',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6200ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 10,
    color: '#fff',
  },
  detailsButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    fontSize: 10,
    color: '#495057',
  },
});