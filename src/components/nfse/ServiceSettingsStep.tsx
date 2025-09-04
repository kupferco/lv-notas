// src/components/nfse/ServiceSettingsStep.tsx

import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';
import { NFSeSettings } from './types';

// Local styles for textarea
const localStyles = {
  textArea: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top' as const,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
};

interface ServiceSettingsStepProps {
  settings: NFSeSettings | null;
  savingSettings: boolean;
  onUpdateSettings: (settings: NFSeSettings) => void;
  onSave: () => void;
}

export const ServiceSettingsStep: React.FC<ServiceSettingsStepProps> = ({
  settings,
  savingSettings,
  onUpdateSettings,
  onSave
}) => {
  if (!settings) {
    return <Text>Settings not available</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>2. Configurações de Serviço</Text>
      <Text style={styles.cardDescription}>
        Configure os códigos de serviço de São Paulo e alíquotas para sua atividade de psicologia.
      </Text>

      <Text style={styles.label}>Código de Serviço Municipal (São Paulo)</Text>
      <Picker
        selectedValue={settings.serviceCode}
        onValueChange={(value) => onUpdateSettings({ ...settings, serviceCode: value })}
        style={styles.picker}
      >
        <Picker.Item label="05118 - Psicologia (2%)" value="05118" />
        <Picker.Item label="05100 - Psicanálise (2%)" value="05100" />
      </Picker>

      <Text style={styles.label}>Alíquota do ISS (%)</Text>
      <Picker
        selectedValue={settings.taxRate.toString()}
        onValueChange={(value) => onUpdateSettings({ ...settings, taxRate: parseFloat(value) })}
        style={styles.picker}
      >
        <Picker.Item label="2%" value="2" />
        <Picker.Item label="3%" value="3" />
        <Picker.Item label="4%" value="4" />
        <Picker.Item label="5%" value="5" />
      </Picker>

      <Text style={styles.label}>Descrição Completa do Serviço</Text>
      <Text style={styles.helperText}>
        Esta descrição aparecerá na discriminação dos serviços na nota fiscal. 
        As datas das sessões serão automaticamente adicionadas no início.
      </Text>
      
      <TextInput
        style={localStyles.textArea}
        value={settings.serviceDescription || ''}
        onChangeText={(text) => onUpdateSettings({ ...settings, serviceDescription: text })}
        placeholder="Exemplo:
Atendimento psicológico nos dias 22 e 28 de julho de 2025 e nos dias 04 e 11 de agosto de 2025

Psicólogo Maria Cristina Kupfer
CRP 06/1503

CNAES Lugar de Vida 4490703

Nesta prestação de serviços incorrerá carga tributária de 5,65%"
        multiline={true}
        numberOfLines={10}
        placeholderTextColor="#999"
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          As datas das sessões do período serão automaticamente inseridas no início da descrição quando a nota fiscal for gerada.
        </Text>
      </View>

      <Pressable
        style={[styles.primaryButton, savingSettings && styles.buttonDisabled]}
        onPress={onSave}
        disabled={savingSettings}
      >
        <Text style={styles.primaryButtonText}>
          {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
        </Text>
      </Pressable>
    </View>
  );
};