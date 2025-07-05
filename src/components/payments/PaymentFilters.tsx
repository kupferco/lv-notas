// src/components/payments/PaymentFilters.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PaymentFiltersProps, QuickFilterType } from '../../types/payments';
import { useSettings } from '../../contexts/SettingsContext';

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  filters,
  patients = [],
  onFiltersChange
}) => {
  const { isSimpleMode, isAdvancedMode } = useSettings();

  const quickFilterOptions = [
    { key: 'current_month' as QuickFilterType, label: 'Mês Atual' },
    { key: 'last_month' as QuickFilterType, label: 'Mês Passado' },
    { key: 'last_3_months' as QuickFilterType, label: 'Últimos 3 Meses' },
    { key: 'last_6_months' as QuickFilterType, label: 'Últimos 6 Meses' }
  ];

  // Get status filter options based on current mode
  const getStatusFilterOptions = () => {
    if (isSimpleMode()) {
      return [
        { label: '📋 Todos', value: 'todos' },
        { label: '✅ Pago', value: 'pago' },
        { label: '○ Pendente', value: 'pendente' }
      ];
    } else {
      return [
        { label: '📋 Todos', value: 'todos' },
        { label: '○ Não Cobrado', value: 'nao_cobrado' },
        { label: '⏳ Aguardando', value: 'aguardando_pagamento' },
        { label: '✅ Pago', value: 'pago' },
        { label: '⚠️ Pendente', value: 'pendente' }
      ];
    }
  };

  const handleQuickFilterPress = (filterType: QuickFilterType) => {
    if (onFiltersChange.onQuickFilterChange) {
      onFiltersChange.onQuickFilterChange(filterType);
    }
  };

  // Get the status filter options for current mode
  const statusFilterOptions = getStatusFilterOptions();

  // Ensure the current status filter is valid for the current mode
  const isCurrentStatusValid = statusFilterOptions.some(option => option.value === filters.statusFilter);
  
  // If current filter is not valid for the mode, we should reset it to 'todos'
  React.useEffect(() => {
    if (!isCurrentStatusValid && onFiltersChange.onStatusFilterChange) {
      console.log('🔄 Resetting invalid status filter to "todos" for current mode');
      onFiltersChange.onStatusFilterChange('todos');
    }
  }, [isCurrentStatusValid, onFiltersChange.onStatusFilterChange]);

  return (
    <View style={styles.container}>
      {/* Period Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>Filtros:</Text>

        {/* Quick filter buttons and Export button row */}
        <View style={styles.filtersRow}>
          <View style={styles.quickFilters}>
            {quickFilterOptions.map(filter => (
              <Pressable
                key={filter.key}
                style={[
                  styles.quickFilterButton,
                  filters.quickFilter === filter.key && styles.quickFilterButtonActive
                ]}
                onPress={() => handleQuickFilterPress(filter.key)}
              >
                <Text style={[
                  styles.quickFilterText,
                  filters.quickFilter === filter.key && styles.quickFilterTextActive
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>
          
          {/* Export Button */}
          <Pressable
            style={styles.exportButton}
            onPress={() => alert('📊 Funcionalidade de exportação será implementada em breve!\n\nPermitirá exportar a visualização atual em formato Excel ou PDF.')}
          >
            <Text style={styles.exportButtonText}>
              📊 Exportar
            </Text>
          </Pressable>
        </View>

        {/* Date Range Display */}
        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateLabel}>De: {filters.dateRange.startDate}</Text>
          <Text style={styles.dateLabel}>Até: {filters.dateRange.endDate}</Text>
        </View>
      </View>

      {/* Horizontal Filters Row */}
      <View style={styles.horizontalFiltersSection}>
        {/* View Type Dropdown */}
        <View style={styles.filterDropdownContainer}>
          <Text style={styles.filterLabel}>Visualização:</Text>
          <Picker
            style={styles.smallPicker}
            selectedValue={filters.viewType}
            onValueChange={(value) => {
              if (onFiltersChange.onViewTypeChange) {
                onFiltersChange.onViewTypeChange(value);
              }
            }}
          >
            <Picker.Item label="👥 Paciente" value="patient" />
            <Picker.Item label="📅 Sessão" value="session" />
          </Picker>
        </View>

        {/* Payment Status Filter - Mode-aware */}
        <View style={styles.filterDropdownContainer}>
          <Text style={styles.filterLabel}>
            Status{isSimpleMode() ? ' (Simples)' : ' (Avançado)'}:
          </Text>
          <Picker
            style={styles.smallPicker}
            selectedValue={isCurrentStatusValid ? filters.statusFilter : 'todos'}
            onValueChange={(value) => {
              if (onFiltersChange.onStatusFilterChange) {
                onFiltersChange.onStatusFilterChange(value);
              }
            }}
          >
            {statusFilterOptions.map(option => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>

        {/* Patient Filter */}
        <View style={styles.filterDropdownContainer}>
          <Text style={styles.filterLabel}>Paciente:</Text>
          <Picker
            style={styles.smallPicker}
            selectedValue={filters.patientFilter}
            onValueChange={(value) => {
              if (onFiltersChange.onPatientFilterChange) {
                onFiltersChange.onPatientFilterChange(value);
              }
            }}
          >
            <Picker.Item label="👥 Todos" value="todos" />
            {patients.map(patient => (
              <Picker.Item
                key={patient.id}
                label={patient.name}
                value={patient.id.toString()}
              />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  filterSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  quickFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  quickFilterButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  quickFilterText: {
    fontSize: 14,
    color: '#495057',
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  horizontalFiltersSection: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
    alignItems: 'flex-end',
  },
  filterDropdownContainer: {
    flex: 1,
    minWidth: 100,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
    fontWeight: '500',
  },
  exportButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#28a745',
    borderWidth: 1,
    borderColor: '#28a745',
    alignSelf: 'flex-start',
  },
  exportButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  smallPicker: {
    // Remove all the custom styling to make it native
    fontSize: 14,
    minHeight: 40,
  },
});