// src/components/payments/SessionPaymentList.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SessionPaymentDetail } from '../../types/payments';
import { isSimpleMode, getStatusOptions } from '../../config/paymentsMode';

interface SessionPaymentListProps {
  sessions: SessionPaymentDetail[];
  onStatusChange?: (sessionId: number, newStatus: string) => void;
}

export const SessionPaymentList: React.FC<SessionPaymentListProps> = ({
  sessions,
  onStatusChange
}) => {
  const formatCurrency = (amount: number): string => {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getStatusConfig = (status: string) => {
    // In simple mode, map the status to display version
    const displayStatus = isSimpleMode() ? 
      (status === 'paid' ? 'paid' : 'pending') : 
      status;

    switch (displayStatus) {
      case 'paid':
        return { 
          color: '#28a745', 
          backgroundColor: '#d4edda', 
          borderColor: '#28a745',
          label: 'Pago',
          icon: '✓'
        };
      case 'aguardando_pagamento':
        return { 
          color: '#fd7e14', 
          backgroundColor: '#fff3cd', 
          borderColor: '#fd7e14',
          label: 'Aguardando',
          icon: '⏳'
        };
      case 'pendente':
        return { 
          color: '#dc3545', 
          backgroundColor: '#f8d7da', 
          borderColor: '#dc3545',
          label: 'Pendente',
          icon: '⚠️'
        };
      case 'pending':
      default:
        if (isSimpleMode()) {
          return { 
            color: '#dc3545', 
            backgroundColor: '#f8d7da', 
            borderColor: '#dc3545',
            label: 'Pendente',
            icon: '○'
          };
        } else {
          return { 
            color: '#6c757d', 
            backgroundColor: '#f8f9fa', 
            borderColor: '#6c757d',
            label: 'Não Cobrado',
            icon: '○'
          };
        }
    }
  };

  const getDisplayStatus = (session: SessionPaymentDetail) => {
    if (isSimpleMode()) {
      return session.payment_status === 'paid' ? 'paid' : 'pending';
    }
    return session.payment_status;
  };

  const handleStatusChange = (session: SessionPaymentDetail, newStatus: string) => {
    if (onStatusChange && newStatus !== session.payment_status) {
      let actualStatus = newStatus;
      
      // If in simple mode and user selected 'pending', preserve granular status when possible
      if (isSimpleMode() && newStatus === 'pending') {
        if (['pending', 'aguardando_pagamento', 'pendente'].includes(session.payment_status)) {
          actualStatus = session.payment_status;
        } else {
          actualStatus = 'pending';
        }
      }
      
      onStatusChange(session.session_id, actualStatus);
    }
  };

  const statusOptions = getStatusOptions();

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.patientColumn]}>Paciente</Text>
        <Text style={[styles.headerCell, styles.dateColumn]}>Data</Text>
        <Text style={[styles.headerCell, styles.priceColumn]}>Valor</Text>
        <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
        <Text style={[styles.headerCell, styles.daysColumn]}>Dias</Text>
      </View>

      {/* Data Rows */}
      <ScrollView style={styles.scrollContainer}>
        {sessions.map((session) => {
          const displayStatus = getDisplayStatus(session);
          const statusConfig = getStatusConfig(displayStatus);
          
          return (
            <View key={session.session_id} style={styles.dataRow}>
              {/* Patient Name */}
              <View style={[styles.dataCell, styles.patientColumn]}>
                <Text style={styles.patientName} numberOfLines={1}>
                  {session.patient_name}
                </Text>
                <Text style={styles.sessionId}>
                  #{session.session_id}
                </Text>
              </View>

              {/* Session Date */}
              <View style={[styles.dataCell, styles.dateColumn]}>
                <Text style={styles.sessionDate}>
                  {formatDate(session.session_date)}
                </Text>
              </View>

              {/* Session Price */}
              <View style={[styles.dataCell, styles.priceColumn]}>
                <Text style={styles.sessionPrice}>
                  {formatCurrency(session.session_price)}
                </Text>
              </View>

              {/* Status Picker */}
              <View style={[styles.dataCell, styles.statusColumn]}>
                <View style={[
                  { 
                    backgroundColor: statusConfig.backgroundColor,
                    borderColor: statusConfig.borderColor 
                  }
                ]}>
                  <Picker
                    selectedValue={displayStatus}
                    onValueChange={(newStatus) => handleStatusChange(session, newStatus)}
                    style={[styles.statusPicker, { color: statusConfig.color }]}
                    dropdownIconColor={statusConfig.color}
                  >
                    {statusOptions.map(option => (
                      <Picker.Item 
                        key={option.value} 
                        label={option.label} 
                        value={option.value} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Days Since Session */}
              <View style={[styles.dataCell, styles.daysColumn]}>
                {session.days_since_session && (
                  <Text style={styles.daysText}>
                    {session.days_since_session}d
                  </Text>
                )}
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
    paddingVertical: 6,
    minHeight: 45,
    alignItems: 'center',
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // Column widths
  patientColumn: {
    flex: 3,
  },
  dateColumn: {
    flex: 2,
    alignItems: 'center',
  },
  priceColumn: {
    flex: 2,
    alignItems: 'center',
  },
  statusColumn: {
    flex: 3,
    alignItems: 'center',
  },
  daysColumn: {
    flex: 1,
    alignItems: 'center',
  },
  // Data cell content
  patientName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  sessionId: {
    fontSize: 9,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  sessionDate: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  sessionPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
  },
  statusPicker: {
    flex: 1,
    height: 24,
    fontSize: 10,
    fontWeight: 'bold',
  },
  daysText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
});