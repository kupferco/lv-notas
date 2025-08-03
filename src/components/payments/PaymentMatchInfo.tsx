// src/components/payments/PaymentMatchInfo.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PaymentMatchInfoProps {
    match: {
        transaction_id: string;
        transaction_amount: number;
        transaction_date: string;
        transaction_description: string;
        transaction_type: string;
        sender_name: string;
        lv_reference: string;
        confidence: number;
        match_reasons: string[];
    };
}

export const PaymentMatchInfo: React.FC<PaymentMatchInfoProps> = ({ match }) => {
    const formatCurrency = (amount: number): string => {
        return `R$ ${amount.toFixed(2).replace('.', ',')}`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.8) return '#28a745'; // High confidence - green
        if (confidence >= 0.6) return '#ffc107'; // Medium confidence - yellow
        return '#dc3545'; // Low confidence - red
    };

    const getConfidenceText = (confidence: number): string => {
        if (confidence >= 0.8) return 'Alta';
        if (confidence >= 0.6) return 'Média';
        return 'Baixa';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🎯 Pagamento Encontrado</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(match.confidence) }]}>
                    <Text style={styles.confidenceText}>
                        {getConfidenceText(match.confidence)} ({Math.round(match.confidence * 100)}%)
                    </Text>
                </View>
            </View>

            <View style={styles.details}>
                <Text style={styles.detailText}>
                    💰 {formatCurrency(match.transaction_amount)} • {match.transaction_type.toUpperCase()} • {formatDate(match.transaction_date)}
                </Text>
                <Text style={styles.detailText}>
                    👤 {match.sender_name}
                </Text>
                <Text style={styles.detailText}>
                    🔗 Referência: {match.lv_reference}
                </Text>
                {match.match_reasons && match.match_reasons.length > 0 && (
                    <Text style={styles.reasonsText}>
                        ✅ Correspondência: {match.match_reasons.map(reason => {
                            switch (reason) {
                                case 'lv_reference_match': return 'Referência LV';
                                case 'cpf_match': return 'CPF';
                                case 'exact_amount_match': return 'Valor exato';
                                case 'close_amount_match': return 'Valor aproximado';
                                case 'name_match': return 'Nome';
                                default: return reason;
                            }
                        }).join(', ')}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#d4edda',
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#155724',
    },
    confidenceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    confidenceText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    details: {
        gap: 2,
    },
    detailText: {
        fontSize: 12,
        color: '#155724',
    },
    reasonsText: {
        fontSize: 11,
        color: '#0f5132',
        fontStyle: 'italic',
        marginTop: 4,
    },
});