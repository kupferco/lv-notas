// src/components/nfse/TestInvoiceStep.tsx

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './styles';
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext';

interface TestInvoiceStepProps {
    onNavigateToTest: () => void;
}


export const TestInvoiceStep: React.FC<TestInvoiceStepProps> = ({ onNavigateToTest }) => {

    const [testingInvoice, setTestingInvoice] = useState(false);
    const [testError, setTestError] = useState('');
    const [testResult, setTestResult] = useState<{
        success: boolean;
        invoiceId?: string;
        message: string;
        pdfUrl?: string;
    } | null>(null);

    const { user } = useAuth();
    const therapistId = user?.therapistId?.toString() || "1"; // Fallback for testing

    const handleTestInvoice = async () => {
        try {
            setTestingInvoice(true);
            setTestError('');

            // Get first available billing period with sessions
            const billingPeriod = await api.nfse.getFirstAvailableBillingPeriod(therapistId);

            if (!billingPeriod) {
                setTestError('Nenhum período de cobrança disponível. Processe as cobranças mensais primeiro.');
                return;
            }

            // Generate test invoice in sandbox environment
            const testData = {
                patientId: billingPeriod.patient_id.toString(),
                year: billingPeriod.year,
                month: billingPeriod.month,
                customerData: {
                    document: '00000000000', // Test CPF for homologação
                    name: 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
                    address: {
                        street: 'Rua Teste',
                        number: '123',
                        neighborhood: 'Centro',
                        city: 'São Paulo',
                        state: 'SP',
                        zipCode: '01000-000',
                        cityCode: '3550308'
                    }
                }
            };

            const result = await api.nfse.generateInvoice(therapistId, testData);

            setTestResult({
                success: result.invoice.status !== 'error',
                invoiceId: result.invoice.invoiceId,
                message: result.invoice.status === 'error'
                    ? (result.invoice.error || 'Erro ao gerar nota fiscal de teste')
                    : 'Nota fiscal de teste gerada com sucesso!',
                pdfUrl: result.invoice.pdfUrl
            });

        } catch (error) {
            console.error('Test invoice error:', error);
            setTestError(
                error instanceof Error
                    ? error.message
                    : 'Erro ao gerar nota fiscal de teste'
            );
        } finally {
            setTestingInvoice(false);
        }
    };

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Teste de Emissão</Text>
            <Text style={styles.cardDescription}>
                Teste sua configuração gerando uma nota fiscal de demonstração em ambiente seguro.
            </Text>

            <View style={styles.safetyBox}>
                <Text style={styles.safetyTitle}>✅ Teste 100% Seguro</Text>
                <Text style={styles.safetyText}>
                    • Ambiente de homologação isolado (sandbox)
                </Text>
                <Text style={styles.safetyText}>
                    • Nota fiscal SEM valor fiscal ou legal
                </Text>
                <Text style={styles.safetyText}>
                    • Não gera obrigações tributárias
                </Text>
                <Text style={styles.safetyText}>
                    • Usa dados reais para validar configuração
                </Text>
                <Text style={styles.safetyText}>
                    • PDF marcado como "TESTE - SEM VALOR FISCAL"
                </Text>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    ℹ️ Este teste gerará uma NFS-e de demonstração usando dados de uma sessão real,
                    mas em ambiente de testes da Prefeitura. É completamente seguro e não tem
                    consequências fiscais ou tributárias.
                </Text>
            </View>

            <Pressable
                style={styles.primaryButton}
                onPress={handleTestInvoice}
            >
                <Text style={styles.primaryButtonText}>
                    🧪 Gerar Nota Fiscal de Teste
                </Text>
            </Pressable>
        </View>
    );
};