// src/components/payments/monthly/BillingHeader.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BillingSummary } from '../../../types/calendar-only';
import { CertificateStatus } from '../../../services/api/nfse-service';

interface BillingHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  billingSummary: BillingSummary[];
  isAutoCheckInEnabled: () => boolean;
  certificateStatus: CertificateStatus | null;
  loading: boolean;
  isExporting: boolean;
  onExport: () => void;
}

export const BillingHeader: React.FC<BillingHeaderProps> = ({
  selectedMonth,
  selectedYear,
  billingSummary,
  isAutoCheckInEnabled,
  certificateStatus,
  loading,
  isExporting,
  onExport
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>💰 Cobrança Mensal</Text>
        <Text style={styles.subtitle}>
          {selectedMonth}/{selectedYear} • {billingSummary.length} pacientes com sessões
          {isAutoCheckInEnabled() && ' • ⚡ Modo Calendário Ativo'}
          {certificateStatus?.hasValidCertificate && ' • 🧾 NFS-e Configurado'}
        </Text>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          style={[
            styles.exportButton, 
            (loading || billingSummary.length === 0 || isExporting) && styles.exportButtonDisabled
          ]}
          onPress={onExport}
          disabled={loading || billingSummary.length === 0 || isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? '📊 Exportando...' : '📊 Exportar XLSX'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 140,
    alignItems: 'center',
  },
  exportButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});