// src/components/nfse/CertificateUploadStep.tsx

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { styles } from './styles';
import type { CertificateStatus } from './types';

interface CertificateUploadStepProps {
    certificateStatus: CertificateStatus | null;
    uploadingCertificate: boolean;
    certificateUploadError: string;
    validating: boolean;
    onUpload: () => void;
}

export const CertificateUploadStep: React.FC<CertificateUploadStepProps> = ({
    certificateStatus,
    uploadingCertificate,
    certificateUploadError,
    validating,
    onUpload
}) => {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Certificado Digital e Registro</Text>
            <Text style={styles.cardDescription}>
                Faça upload do seu certificado digital A1 no formato .p12 ou .pfx.
                O sistema automaticamente validará e registrará sua empresa.
            </Text>

            {/* Show current certificate if exists and validated */}
            {certificateStatus?.hasValidCertificate && certificateStatus?.validationStatus === 'validated' && (
                <View style={styles.successContainer}>
                    <Text style={styles.successTitle}>✅ Configuração Completa</Text>
                    <Text style={styles.successText}>
                        Empresa: {certificateStatus.certificateInfo?.companyName}
                    </Text>
                    {certificateStatus.certificateInfo?.cnpj && (
                        <Text style={styles.successText}>
                            CNPJ: {certificateStatus.certificateInfo.cnpj}
                        </Text>
                    )}
                    {certificateStatus.certificateInfo?.autoRegistered && (
                        <Text style={styles.successText}>
                            ✅ Empresa registrada automaticamente
                        </Text>
                    )}
                    <Text style={styles.successText}>
                        ✅ Integração validada e pronta para uso
                    </Text>
                    {certificateStatus.expiresAt && (
                        <Text style={styles.successText}>
                            Certificado válido até: {new Date(certificateStatus.expiresAt).toLocaleDateString()}
                        </Text>
                    )}

                    {certificateStatus.expiresIn30Days && (
                        <View style={styles.warningContainer}>
                            <Text style={styles.warningText}>
                                ⚠️ Atenção: Seu certificado expira em menos de 30 dias!
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Show validation in progress */}
            {(validating || certificateStatus?.validationStatus === 'validating') && (
                <View style={styles.infoBox}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.infoText}>
                        Validando configuração...
                    </Text>
                    <Text style={styles.infoText}>
                        • Verificando certificado
                    </Text>
                    <Text style={styles.infoText}>
                        • Extraindo informações da empresa
                    </Text>
                    <Text style={styles.infoText}>
                        • Registrando no sistema de NFS-e
                    </Text>
                    <Text style={styles.infoText}>
                        • Testando integração
                    </Text>
                </View>
            )}

            {/* Show validation errors if any */}
            {certificateStatus?.validationStatus === 'error' && certificateStatus?.validationError && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        ⚠️ {certificateStatus.validationError}
                    </Text>
                    {certificateStatus.validationError.includes('CNPJ') && (
                        <Text style={styles.errorText}>
                            Por favor, verifique se o certificado pertence à empresa correta.
                        </Text>
                    )}
                    {certificateStatus.validationError.includes('município') && (
                        <Text style={styles.errorText}>
                            Pode ser necessário registro manual na prefeitura.
                        </Text>
                    )}
                </View>
            )}

            {/* Show upload errors */}
            {certificateUploadError && 
             !validating && 
             certificateStatus?.validationStatus !== 'validating' && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {certificateUploadError}</Text>
                </View>
            )}

            {/* Manual company registration form - only if needed */}
            {certificateStatus?.hasValidCertificate && 
             !certificateStatus?.certificateInfo?.cnpj && 
             certificateStatus?.validationStatus !== 'validating' && (
                <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                        ⚠️ Não foi possível extrair o CNPJ do certificado
                    </Text>
                    <Text style={styles.warningText}>
                        Será necessário registro manual da empresa
                    </Text>
                </View>
            )}

            {/* Upload button */}
            <Pressable
                style={[
                    styles.primaryButton, 
                    (uploadingCertificate || validating) && styles.buttonDisabled
                ]}
                onPress={onUpload}
                disabled={uploadingCertificate || validating}
            >
                <Text style={styles.primaryButtonText}>
                    {uploadingCertificate
                        ? 'Enviando certificado...'
                        : validating
                        ? 'Validando...'
                        : certificateStatus?.hasValidCertificate && certificateStatus?.validationStatus === 'validated'
                            ? '🔄 Atualizar Certificado'
                            : '🔒 Fazer Upload do Certificado'}
                </Text>
            </Pressable>
        </View>
    );
};