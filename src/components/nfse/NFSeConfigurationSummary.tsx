// src/components/nfse/NFSeConfigurationSummary.tsx

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from './styles';
import { CertificateStatus, NFSeSettings } from './types';

interface NFSeConfigurationSummaryProps {
  certificateStatus: CertificateStatus;
  nfseSettings: NFSeSettings | null;
  onUpdateCertificate: () => void;
  onUpdateSettings: () => void;
  //   onTestInvoice: () => void;
}

export const NFSeConfigurationSummary: React.FC<NFSeConfigurationSummaryProps> = ({
  certificateStatus,
  nfseSettings,
  onUpdateCertificate,
  onUpdateSettings,
  //   onTestInvoice
}) => {
  if (!nfseSettings) {
    return <Text>Settings not available</Text>;
  }
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✅ NFS-e Configurado</Text>
        <Text style={styles.subtitle}>
          Sistema pronto para emitir notas fiscais
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Certificado Digital</Text>
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            Empresa: {certificateStatus.certificateInfo?.companyName}
          </Text>
          <Text style={styles.successText}>
            CNPJ: {certificateStatus.certificateInfo?.cnpj}
          </Text>
          <Text style={styles.successText}>
            Válido até: {certificateStatus.expiresAt ? new Date(certificateStatus.expiresAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={onUpdateCertificate}>
          <Text style={styles.secondaryButtonText}>🔄 Atualizar Certificado</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configurações de Serviço</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Código: {nfseSettings.serviceCode}</Text>
          <Text style={styles.infoText}>Alíquota ISS: {nfseSettings.taxRate}%</Text>
          <Text style={styles.infoText}>Descrição: {nfseSettings.serviceDescription}</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={onUpdateSettings}>
          <Text style={styles.secondaryButtonText}>⚙️ Alterar Configurações</Text>
        </Pressable>
      </View>

      {/* <View style={styles.card}>
        <Text style={styles.cardTitle}>Ações</Text>
        <Pressable style={styles.primaryButton} onPress={onTestInvoice}>
          <Text style={styles.primaryButtonText}>🧪 Gerar Nota de Teste</Text>
        </Pressable>
      </View> */}
    </ScrollView>
  );
};