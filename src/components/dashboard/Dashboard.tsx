// src/components/dashboard/Dashboard.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// import { NFSeTestingSection } from '../nfse/NFSeTestingSection';

export const Dashboard: React.FC = () => {
  // Generate test content
  const testItems = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    title: `Dashboard Item ${index + 1}`,
    description: `This is test content item ${index + 1} to test scrolling behavior within the dashboard area.`,
  }));

  return (
    <View style={styles.container}>
      {/* Fixed Dashboard Header */}
      {/* <View style={styles.fixedDashboardHeader}>
        <Text style={styles.headerTitle}>📊 Dashboard Analytics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>42</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>R$ 12,500</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>
      </View> */}

      {/* Scrollable Dashboard Content */}
      <ScrollView
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* <View style={styles.section}>
          <NFSeTestingSection />
        </View> */}
        <Text style={styles.contentTitle}>Em breve</Text>
        {/* <Text style={styles.contentTitle}>Recent Activity</Text>
        <Text style={styles.instructions}>
          This content should scroll while the dashboard header stays fixed above.
          The main navigation should also stay fixed at the very top.
        </Text>

        {testItems.map((item) => (
          <View key={item.id} style={styles.contentItem}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>
        ))}

        <View style={styles.bottomArea}>
          <Text style={styles.bottomTitle}>🎯 End of Dashboard</Text>
          <Text style={styles.bottomText}>
            If you can see this, the scrolling works! Both the main nav and dashboard header should be visible.
          </Text>
        </View> */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    marginBottom: 20,
  },
  fixedDashboardHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  contentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  bottomArea: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
  },
  bottomTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 12,
  },
  bottomText: {
    fontSize: 16,
    color: '#155724',
    textAlign: 'center',
    lineHeight: 22,
  },
});