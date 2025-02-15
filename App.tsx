import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { CheckInForm } from './src/components/CheckInForm';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <CheckInForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});