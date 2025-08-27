// src/components/nfse/CertificateUploadStep.tsx

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './styles';
import type { CertificateStatus } from './types';

interface CertificateUploadStepProps {
    certificateStatus: CertificateStatus | null;
    uploadingCertificate: boolean;
    certificateUploadError: string;
    onUpload: () => void;
}

export const CertificateUploadStep: React.FC<CertificateUploadStepProps> = ({
    certificateStatus,
    uploadingCertificate,
    certificateUploadError,
    onUpload
}) => {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Certificado Digital</Text>
            <Text style={styles.cardDescription}>
                Faça upload do seu certificado digital A1 no formato .p12 ou .pfx.
                Este certificado é necessário para assinar digitalmente as notas fiscais.
            </Text>

            {certificateStatus && certificateStatus.hasValidCertificate && (
                <View style={styles.successContainer}>
                    <Text style={styles.successTitle}>✅ Certificado Válido</Text>
                    <Text style={styles.successText}>
                        Empresa: {certificateStatus.certificateInfo?.commonName}
                    </Text>
                    <Text style={styles.successText}>
                        Emissor: {certificateStatus.certificateInfo?.issuer}
                    </Text>
                    {certificateStatus.expiresAt && (
                        <Text style={styles.successText}>
                            Expira em: {new Date(certificateStatus.expiresAt).toLocaleDateString()}
                        </Text>
                    )}
                    {certificateStatus.certificateInfo?.cnpj && (
                        <>
                            <Text style={styles.successText}>
                                CNPJ: {certificateStatus.certificateInfo.cnpj}
                            </Text>
                            <Text style={styles.successText}>
                                Empresa registrada no Focus NFe ✅
                            </Text>
                        </>
                    )}

                    {/* Warning for expiring certificates */}
                    {certificateStatus.expiresIn30Days && (
                        <View style={styles.warningContainer}>
                            <Text style={styles.warningText}>
                                ⚠️ Atenção: Seu certificado expira em menos de 30 dias!
                            </Text>
                            <Text style={styles.warningText}>
                                Providencie um novo certificado para evitar interrupções.
                            </Text>
                        </View>
                    )}
                </View>
            )}
            
            {certificateUploadError && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>⚠️ {certificateUploadError}</Text>
                </View>
            )}

            {/* Upload button always visible */}
            <Pressable
                style={[styles.primaryButton, uploadingCertificate && styles.buttonDisabled]}
                onPress={onUpload}
                disabled={uploadingCertificate}
            >
                <Text style={styles.primaryButtonText}>
                    {uploadingCertificate
                        ? 'Enviando...'
                        : certificateStatus?.hasValidCertificate
                            ? '🔄 Fazer Upload de Novo Certificado'
                            : '🔒 Fazer Upload do Certificado'}
                </Text>
            </Pressable>
        </View>
    );
};