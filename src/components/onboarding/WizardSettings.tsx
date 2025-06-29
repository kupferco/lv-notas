// src/components/onboarding/WizardSettings.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';

interface WizardSettingsProps {
  defaultPrice: number; // in cents
  totalEvents: number;
  onComplete: (settings: { defaultPrice: number }) => void;
  onCancel: () => void;
  onNavigateToPatients: () => void; // Add this new prop
  mode: 'onboarding' | 'settings';
}

export const WizardSettings: React.FC<WizardSettingsProps> = ({
  defaultPrice,
  totalEvents,
  onComplete,
  onCancel,
  onNavigateToPatients, // Add this prop
  mode
}) => {
  const [sessionPrice, setSessionPrice] = useState<string>(
    (defaultPrice / 100).toFixed(2).replace('.', ',')
  );
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: string): string => {
    // Remove non-numeric characters except comma
    const numericValue = value.replace(/[^\d,]/g, '');
    
    // Ensure only one comma
    const parts = numericValue.split(',');
    if (parts.length > 2) {
      return parts[0] + ',' + parts.slice(1).join('').slice(0, 2);
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + ',' + parts[1].slice(0, 2);
    }
    
    return numericValue;
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatCurrency(value);
    setSessionPrice(formatted);
    setError(null);
  };

  const validateAndProceed = () => {
    // Convert R$ format to cents
    const numericPrice = parseFloat(sessionPrice.replace(',', '.'));
    
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Por favor, insira um valor válido para a sessão');
      return;
    }

    if (numericPrice < 10) {
      setError('O valor da sessão deve ser pelo menos R$ 10,00');
      return;
    }

    if (numericPrice > 10000) {
      setError('O valor da sessão não pode exceder R$ 10.000,00');
      return;
    }

    const priceInCents = Math.round(numericPrice * 100);
    onComplete({ defaultPrice: priceInCents });
  };

  const handleSkipImport = () => {
    // User wants to skip the import wizard entirely
    onCancel();
  };

  const handleManualPatientImport = () => {
    // Simple navigation to patients section
    console.log("🎯 Navigating to patients section");
    window.location.href = "/pacientes";
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'onboarding' ? '📅 Importar Pacientes do Calendário' : '📅 Importar Novos Pacientes'}
          </Text>
          <Text style={styles.subtitle}>
            {totalEvents > 0 
              ? `Encontramos ${totalEvents} eventos em seu calendário que parecem sessões de terapia.`
              : 'Nenhum evento encontrado para importar.'
            }
          </Text>
        </View>

        {totalEvents > 0 ? (
          <>
            {/* Default Session Price Setting */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Valor Padrão da Sessão</Text>
              <Text style={styles.sectionDescription}>
                Este valor será usado como padrão para todos os pacientes. 
                Você poderá ajustar individualmente durante a importação.
              </Text>
              
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={sessionPrice}
                  onChangeText={handlePriceChange}
                  keyboardType="numeric"
                  placeholder="300,00"
                  placeholderTextColor="#999"
                />
              </View>
              
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>

            {/* Import Process Explanation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Como Funciona a Importação</Text>
              <View style={styles.processSteps}>
                <Text style={styles.processStep}>
                  1. Revisaremos cada evento do calendário
                </Text>
                <Text style={styles.processStep}>
                  2. Você preencherá os dados dos pacientes (email, telefone)
                </Text>
                <Text style={styles.processStep}>
                  3. Definirá quando começar a cobrança
                </Text>
                <Text style={styles.processStep}>
                  4. Todos os dados serão salvos automaticamente
                </Text>
              </View>
            </View>

            {/* Options Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚙️ Opções de Importação</Text>
              
              <View style={styles.optionsContainer}>
                <Pressable style={styles.optionCard} onPress={validateAndProceed}>
                  <Text style={styles.optionTitle}>📝 Importação Manual</Text>
                  <Text style={styles.optionDescription}>
                    Revise cada evento e adicione dados dos pacientes manualmente
                  </Text>
                  <Text style={styles.optionRecommended}>✨ Recomendado</Text>
                </Pressable>

                <Pressable style={styles.optionCardDisabled}>
                  <Text style={styles.optionTitleDisabled}>📊 Importar Excel</Text>
                  <Text style={styles.optionDescriptionDisabled}>
                    Importe dados de uma planilha (em breve)
                  </Text>
                  <Text style={styles.optionComingSoon}>🚧 Em breve</Text>
                </Pressable>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable style={styles.skipButton} onPress={handleSkipImport}>
                <Text style={styles.skipButtonText}>Pular Importação</Text>
              </Pressable>
              <Pressable style={styles.continueButton} onPress={validateAndProceed}>
                <Text style={styles.continueButtonText}>Iniciar Importação</Text>
              </Pressable>
            </View>
          </>
        ) : (
          /* No Events Found */
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsTitle}>🤔 Nenhum Evento Encontrado</Text>
            <Text style={styles.noEventsDescription}>
              Não encontramos eventos que pareçam sessões de terapia nos últimos 6 meses.
              Isso pode acontecer se:
            </Text>
            
            <View style={styles.reasonsList}>
              <Text style={styles.reasonItem}>• Você começou a usar este calendário recentemente</Text>
              <Text style={styles.reasonItem}>• Os eventos estão em outro calendário</Text>
              <Text style={styles.reasonItem}>• Os eventos foram cancelados ou deletados</Text>
            </View>

            <View style={styles.noEventsActions}>
              <Pressable style={styles.addPatientsButton} onPress={handleManualPatientImport}>
                <Text style={styles.addPatientsButtonText}>👥 Adicionar Pacientes Manualmente</Text>
              </Pressable>
              
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 8,
  },
  processSteps: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  processStep: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6200ee',
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  optionCardDisabled: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 20,
    opacity: 0.6,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  optionTitleDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionDescriptionDisabled: {
    fontSize: 14,
    color: '#adb5bd',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionRecommended: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
  },
  optionComingSoon: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  noEventsDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  reasonsList: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  reasonItem: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    paddingLeft: 8,
  },
  noEventsActions: {
    width: '100%',
    gap: 12,
  },
  addPatientsButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addPatientsButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
  },
});