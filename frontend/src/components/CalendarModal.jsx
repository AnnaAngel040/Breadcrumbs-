import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { fetchUserEntries } from '../services/api';

export default function CalendarModal({ visible, onClose, userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchUserEntries(userId).then((data) => {
        // Sort newest first
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sorted);
        setLoading(false);
      });
    }
  }, [visible, userId]);

  const getScoreBadge = (score) => {
    if (score < 0.4) return { label: 'Low Stress', color: '#3A7D44', bg: '#E8F5E9' };
    if (score < 0.7) return { label: 'Moderate', color: '#D97706', bg: '#FEF3C7' };
    return { label: 'High Stress', color: '#DC2626', bg: '#FEE2E2' };
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Breadcrumb Trail</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>
            History & Check-ins for <Text style={styles.bold}>{userId}</Text>
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading past check-ins...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍞</Text>
              <Text style={styles.emptyTitle}>No breadcrumbs yet</Text>
              <Text style={styles.emptyText}>
                Complete your first voice or text check-in to start leaving your trail!
              </Text>
            </View>
          ) : (
            entries.map((entry, idx) => {
              const badge = getScoreBadge(entry.stress_score || 0.4);
              return (
                <View key={entry.entry_id || idx} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.dateDotRow}>
                      <View style={[styles.dot, { backgroundColor: badge.color }]} />
                      <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.transcriptText}>"{entry.transcript}"</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.categoryTag}>📂 {entry.category || 'General'}</Text>
                    <Text style={styles.scoreText}>
                      Score: {Math.round((entry.stress_score || 0) * 100)}%
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7ECCD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.1)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 46, 24, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#4A2E18',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  subHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(251, 242, 217, 0.7)',
  },
  subHeaderText: {
    fontSize: 13,
    color: '#6B4423',
  },
  bold: {
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  entryCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C522D',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  transcriptText: {
    fontSize: 15,
    color: '#382211',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.06)',
    paddingTop: 8,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4423',
  },
  scoreText: {
    fontSize: 12,
    color: '#8D633D',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 6,
    fontFamily: 'Fraunces',
  },
  emptyText: {
    fontSize: 14,
    color: '#7C522D',
    textAlign: 'center',
    maxWidth: 260,
  },
});
