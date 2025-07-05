// src/components/common/ToggleSwitch.tsx

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ToggleOption {
  label: string;
  value: string;
  icon?: string;
}

interface ToggleSwitchProps {
  options: ToggleOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: any;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  options,
  selectedValue,
  onValueChange,
  style,
  disabled = false
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        
        return (
          <Pressable
            key={option.value}
            style={[
              styles.option,
              isSelected && styles.selectedOption,
              isFirst && styles.firstOption,
              isLast && styles.lastOption,
              disabled && styles.disabledOption
            ]}
            onPress={() => !disabled && onValueChange(option.value)}
            disabled={disabled}
          >
            <Text style={[
              styles.optionText,
              isSelected && styles.selectedText,
              disabled && styles.disabledText
            ]}>
              {option.icon && `${option.icon} `}{option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: '#6200ee',
    shadowColor: '#6200ee',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  firstOption: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  lastOption: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
});