// src/components/nfse/StepProgress.tsx

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from './styles';
import { SetupStep } from './types';

interface StepProgressProps {
  steps: SetupStep[];
  currentStep: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, currentStep }) => {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.stepsContainer}>
      <Text style={styles.stepsTitle}>Progresso da Configuração</Text>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepItem}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{getStepIcon(step.status)}</Text>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: getStepColor(step.status) }]}>
                {index + 1}. {step.title}
              </Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>

          {step.action && step.status === 'pending' && currentStep === index && (
            <Pressable style={styles.stepAction} onPress={step.action}>
              <Text style={styles.stepActionText}>Configurar</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
};