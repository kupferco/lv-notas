// src/components/payments/PaymentFilters.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PaymentFiltersProps, QuickFilterType } from '../../types/payments';

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  filters,
  patients = [],
  onFiltersChange
}) => {
  const quickFilterOptions = [
    { key: 'current_month' as QuickFilterType, label: 'Mês Atual' },
    { key: 'last_month' as QuickFilterType, label: 'Mês Passado' },
    { key: 'last_3_months' as QuickFilterType, label: 'Últimos 3 Meses' },
    { key: 'last_6_months' as QuickFilterType, label: 'Últimos 6 Meses' }
  ];

  const handleQuickFilterPress = (filterType: QuickFilterType) => {
    if (onFiltersChange.onQuickFilterChange) {
      onFiltersChange.onQuickFilterChange(filterType);
    }
  };

  return (
    <View style={styles.container}>
      {/* Period Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>Filtros:</Text>

        {/* Quick filter buttons */}
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

        {/* Payment Status Filter */}
        <View style={styles.filterDropdownContainer}>
          <Text style={styles.filterLabel}>Status:</Text>
          <Picker
            style={styles.smallPicker}
            selectedValue={filters.statusFilter}
            onValueChange={(value) => {
              if (onFiltersChange.onStatusFilterChange) {
                onFiltersChange.onStatusFilterChange(value);
              }
            }}
          >
            <Picker.Item label="📋 Todos" value="todos" />
            <Picker.Item label="📄 Não Cobrado" value="nao_cobrado" />
            <Picker.Item label="⏰ Aguardando" value="aguardando_pagamento" />
            <Picker.Item label="✅ Pago" value="pago" />
            <Picker.Item label="🔔 Pendente" value="pendente" />
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
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
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
  smallPicker: {
    // Remove all the custom styling to make it native
    fontSize: 14,
    minHeight: 40,
  },
});