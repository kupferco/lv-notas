// src/components/nfse/CompanyRegistrationStep.tsx

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './styles';
import { CertificateStatus } from './types';

interface CompanyRegistrationStepProps {
  certificateStatus: CertificateStatus | null;
  onContinue: () => void;
}

export const CompanyRegistrationStep: React.FC<CompanyRegistrationStepProps> = ({
  certificateStatus,
  onContinue
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>3. Registro da Empresa</Text>

      {certificateStatus?.certificateInfo?.cnpj ? (
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>✅ Empresa Já Registrada</Text>
          <Text style={styles.successText}>
            CNPJ: {certificateStatus.certificateInfo.cnpj}
          </Text>
          <Text style={styles.successText}>
            A empresa foi registrada automaticamente no Focus NFe quando você fez upload do certificado.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={onContinue}
          >
            <Text style={styles.primaryButtonText}>
              Continuar para Teste →
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Não foi possível extrair o CNPJ do certificado.
            Registro manual será necessário.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={onContinue}
          >
            <Text style={styles.secondaryButtonText}>
              ⏭️ Pular para Teste
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};