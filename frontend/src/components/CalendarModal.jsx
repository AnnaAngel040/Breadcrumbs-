import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { fetchUserEntries } from '../services/api';

/**
 * Maps reflection characteristics to subtle, gentle patient-facing mood tags.
 * Retains only gentle mood emojis.
 */
function getGentleMoodTag(entry) {
  const score = entry.stress_score ?? 0.4;
  const transcript = (entry.transcript || entry.reason || '').toLowerCase();

  if (score > 0.75 || transcript.includes("overwhelm") || transcript.includes("can't take") || transcript.includes("drowning")) {
    return { emoji: '🌧️', label: 'Heavier Day', color: '#8B2E18', bg: '#FCEBE6' };
  } else if (score > 0.45 || transcript.includes('busy') || transcript.includes('deadline') || transcript.includes('thinking')) {
    return { emoji: '⛅', label: 'Processing & Reflective', color: '#8A5A18', bg: '#FDF4E3' };
  } else if (transcript.includes('good') || transcript.includes('peace') || transcript.includes('happy') || transcript.includes('relief')) {
    return { emoji: '☀️', label: 'Bright & Uplifted', color: '#2A6B41', bg: '#EBF6EE' };
  } else {
    return { emoji: '🌿', label: 'Grounded & Quiet', color: '#215873', bg: '#EAF3F7' };
  }
}

function formatPrettyDate(isoString) {
  try {
    const d = new Date(isoString);
    return {
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  } catch {
    return { dayName: 'Today', dayNum: '•', month: '', time: '' };
  }
}

/**
 * Cleans extracted reason by removing the word 'trigger' or 'cause' prefix while preserving the full text.
 */
function formatCleanFocus(reason) {
  if (!reason) return '';
  return reason
    .replace(/^(trigger|cause):\s*/i, '')
    .replace(/\btrigger\b:?\s*/gi, '')
    .trim();
}

export default function CalendarModal({ visible, onClose, userId = 'demo_escalating' }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchUserEntries(userId).then((data) => {
        const sorted = [...(data || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(sorted);
        if (sorted.length > 0) {
          setSelectedEntryId(sorted[0].entry_id || '0');
        }
        setLoading(false);
      });
    }
  }, [visible, userId]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Reflection Trail</Text>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Gentle Overview Banner */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewTextBox}>
              <Text style={styles.overviewTitle}>Moments of Decompression</Text>
              <Text style={styles.overviewSubtitle}>
                {entries.length === 0
                  ? 'Your personal space to pause, reflect, and listen to how you feel.'
                  : `${entries.length} reflections recorded. Every small pause gives your mind space to breathe.`}
              </Text>
            </View>
          </View>

          {/* Weekly Mood Dots Track */}
          {entries.length > 0 && (
            <View style={styles.trailCard}>
              <Text style={styles.trailSectionTitle}>RECENT CHECK-IN TRAIL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trailScroll}>
                {entries.slice(0, 7).map((entry, idx) => {
                  const d = formatPrettyDate(entry.date);
                  const mood = getGentleMoodTag(entry);
                  const isSelected = (entry.entry_id || String(idx)) === selectedEntryId;
                  return (
                    <TouchableOpacity
                      key={entry.entry_id || idx}
                      style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                      onPress={() => setSelectedEntryId(entry.entry_id || String(idx))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayPillMonth, isSelected && styles.dayPillTextSelected]}>{d.month}</Text>
                      <Text style={[styles.dayPillNum, isSelected && styles.dayPillTextSelected]}>{d.dayNum}</Text>
                      <View style={[styles.moodDotCircle, { backgroundColor: mood.bg }]}>
                        <Text style={styles.moodDotEmoji}>{mood.emoji}</Text>
                      </View>
                      <Text style={[styles.dayPillName, isSelected && styles.dayPillTextSelected]}>{d.dayName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Reflections Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineSectionTitle}>TIMELINE OF REFLECTIONS</Text>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#53321A" />
                <Text style={styles.loadingText}>Gathering your reflection trail...</Text>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyTitle}>No reflections logged yet</Text>
                <Text style={styles.emptySubtitle}>
                  Take a deep breath and share a quick thought or voice note whenever you are ready.
                </Text>
              </View>
            ) : (
              entries.map((entry, idx) => {
                const mood = getGentleMoodTag(entry);
                const d = formatPrettyDate(entry.date);
                const isSelected = (entry.entry_id || String(idx)) === selectedEntryId;
                const cleanFocus = formatCleanFocus(entry.reason);

                return (
                  <View
                    key={entry.entry_id || idx}
                    style={[styles.entryCard, isSelected && styles.entryCardActive]}
                  >
                    {/* Top Row: Date & Subtle Mood Badge */}
                    <View style={styles.entryTopRow}>
                      <View style={styles.entryDateBox}>
                        <Text style={styles.entryDateText}>
                          {d.dayName}, {d.month} {d.dayNum} • <Text style={styles.entryTimeText}>{d.time}</Text>
                        </Text>
                      </View>
                      <View style={[styles.moodBadge, { backgroundColor: mood.bg }]}>
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text style={[styles.moodBadgeText, { color: mood.color }]}>{mood.label}</Text>
                      </View>
                    </View>

                    {/* Data-Minimizing Reflection Summary */}
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryLabel}>SAVED REFLECTION SUMMARY</Text>
                      <Text style={styles.summaryReasonText}>
                        {cleanFocus ? `Key Focus: ${cleanFocus}` : `Mindful reflection logged under ${entry.category || 'General'}`}
                      </Text>
                    </View>

                    {/* Category Tag & Privacy Status */}
                    <View style={styles.entryBottomRow}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{entry.category || 'Mindful Reflection'}</Text>
                      </View>
                      <View style={styles.privacyBadge}>
                        <Text style={styles.privacyBadgeText}>Encrypted & Minimized</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Privacy & Consent Guarantee Footer Banner */}
          <View style={styles.privacyGuaranteeCard}>
            <Text style={styles.privacyGuaranteeTitle}>Patient Privacy & Data Minimization Guarantee</Text>
            <Text style={styles.privacyGuaranteeText}>
              • Raw audio recordings are processed in-memory and deleted immediately.{"\n"}
              • Verbatim transcripts are discarded; only high-level categories and key focus summaries are stored with AES encryption.{"\n"}
              • Clinical insights are shared with licensed clinicians strictly upon your explicit consent.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6E7B9', // Exact butter yellow
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(83, 50, 26, 0.12)',
    backgroundColor: '#F6E7B9', // Exact butter yellow
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
  },
  closeBtnText: {
    fontSize: 13,
    color: '#53321A', // Exact deep brown
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#53321A', // Exact deep brown
    fontFamily: 'Fraunces, Georgia, serif',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },

  // Overview Banner
  overviewCard: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
    shadowColor: '#53321A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  overviewTextBox: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#53321A', // Exact deep brown
    fontFamily: 'Fraunces, Georgia, serif',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: '#53321A', // Exact deep brown
    opacity: 0.85,
    lineHeight: 19,
  },

  // Trail Card
  trailCard: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
    shadowColor: '#53321A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  trailSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#53321A', // Exact deep brown
    opacity: 0.75,
    marginBottom: 12,
  },
  trailScroll: {
    gap: 10,
  },
  dayPill: {
    backgroundColor: '#F6E7B9', // Exact butter yellow
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 64,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
  },
  dayPillSelected: {
    backgroundColor: '#53321A', // Exact deep brown
    borderColor: '#53321A',
  },
  dayPillMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: '#53321A',
    opacity: 0.75,
  },
  dayPillNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#53321A',
    marginVertical: 2,
  },
  dayPillName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#53321A',
    opacity: 0.75,
    marginTop: 4,
  },
  dayPillTextSelected: {
    color: '#FFF8EA', // Exact soft cream
    opacity: 1,
  },
  moodDotCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  moodDotEmoji: {
    fontSize: 13,
  },

  // Timeline
  timelineSection: {
    gap: 12,
  },
  timelineSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#53321A', // Exact deep brown
    opacity: 0.75,
    marginBottom: 4,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#53321A',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  emptyCard: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#53321A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#53321A',
    opacity: 0.8,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },

  // Entry Card
  entryCard: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
    shadowColor: '#53321A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    gap: 12,
  },
  entryCardActive: {
    borderColor: '#53321A', // Exact deep brown
    borderWidth: 1.5,
    backgroundColor: '#FFF8EA',
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDateBox: {},
  entryDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#53321A', // Exact deep brown
  },
  entryTimeText: {
    fontWeight: '400',
    color: '#53321A',
    opacity: 0.7,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
  },
  moodEmoji: {
    fontSize: 12,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F6E7B9', // Exact butter yellow
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#53321A',
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryReasonText: {
    fontSize: 13,
    color: '#53321A', // Exact deep brown
    fontWeight: '600',
    lineHeight: 18,
  },
  entryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(83, 50, 26, 0.1)',
  },
  categoryPill: {
    backgroundColor: '#F6E7B9', // Exact butter yellow
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#53321A', // Exact deep brown
  },
  privacyBadge: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
  },
  privacyBadgeText: {
    fontSize: 10,
    color: '#53321A',
    fontWeight: '700',
    opacity: 0.85,
  },
  privacyGuaranteeCard: {
    backgroundColor: '#FFF8EA', // Exact soft cream
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D9AD87', // Exact warm tan
    gap: 6,
    marginTop: 8,
  },
  privacyGuaranteeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#53321A', // Exact deep brown
  },
  privacyGuaranteeText: {
    fontSize: 11,
    color: '#53321A', // Exact deep brown
    opacity: 0.85,
    lineHeight: 17,
  },
});
