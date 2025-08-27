// src/components/nfse/ServiceSettingsStep.tsx

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';
import { NFSeSettings } from './types';

interface ServiceSettingsStepProps {
  settings: NFSeSettings;
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
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>2. Configurações de Serviço</Text>
      <Text style={styles.cardDescription}>
        Configure os códigos de serviço e alíquotas para sua atividade de psicologia.
      </Text>

      <Text style={styles.label}>Código de Serviço</Text>
      <Picker
        selectedValue={settings.serviceCode}
        onValueChange={(value) => onUpdateSettings({...settings, serviceCode: value})}
        style={styles.picker}
      >
        <Picker.Item label="14.01 - Psicologia e Psicanálise" value="14.01" />
        <Picker.Item label="14.13 - Terapias Diversas" value="14.13" />
      </Picker>

      <Text style={styles.label}>Alíquota do ISS (%)</Text>
      <Picker
        selectedValue={settings.taxRate.toString()}
        onValueChange={(value) => onUpdateSettings({...settings, taxRate: parseFloat(value)})}
        style={styles.picker}
      >
        <Picker.Item label="2%" value="2" />
        <Picker.Item label="3%" value="3" />
        <Picker.Item label="4%" value="4" />
        <Picker.Item label="5%" value="5" />
      </Picker>

      <Text style={styles.label}>Descrição Padrão do Serviço</Text>
      <View style={styles.input}>
        <Text style={styles.inputText}>{settings.defaultServiceDescription}</Text>
      </View>

      <Pressable 
        style={[styles.primaryButton, savingSettings && styles.buttonDisabled]}
        onPress={onSave}
        disabled={savingSettings}
      >
        <Text style={styles.primaryButtonText}>
          {savingSettings ? 'Salvando...' : '💾 Salvar Configurações'}
        </Text>
      </Pressable>
    </View>
  );
};