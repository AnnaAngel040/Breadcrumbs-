import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { fetchUserReport, fetchTherapistPatientReport, fetchTherapistPatientEntries, fetchUserEntries } from '../services/api';

export default function ReportModal({ visible, onClose, userId, therapistId = null }) {
  const [report, setReport] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      const reportPromise = therapistId
        ? fetchTherapistPatientReport(therapistId, userId)
        : fetchUserReport(userId);

      const entriesPromise = therapistId
        ? fetchTherapistPatientEntries(therapistId, userId)
        : fetchUserEntries(userId);

      Promise.all([reportPromise, entriesPromise]).then(([rep, ent]) => {
        setReport(rep);
        setEntries(ent || []);
        setLoading(false);
      });
    }
  }, [visible, userId, therapistId]);

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'flagged':
        return { color: '#B91C1C', bg: '#FEE2E2', label: 'ACUTE / FLAGGED' };
      case 'high':
        return { color: '#C2410C', bg: '#FFEDD5', label: 'HIGH SEVERITY' };
      case 'medium':
        return { color: '#B45309', bg: '#FEF3C7', label: 'MODERATE' };
      default:
        return { color: '#15803D', bg: '#DCFCE7', label: 'LOW / STABLE' };
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'escalating') return { icon: '↗️', text: 'Escalating', color: '#DC2626' };
    if (trend === 'improving') return { icon: '↘️', text: 'Improving', color: '#16A34A' };
    return { icon: '➡️', text: 'Stable', color: '#D97706' };
  };

  const handleCall = (number) => {
    try {
      Linking.openURL(`tel:${number}`);
    } catch (e) {
      console.log('Call action', number);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinical Stress Insights</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Computing 7-day decay stress analytics...</Text>
            </View>
          ) : report ? (
            <>
              {/* MANDATORY CRISIS HOTLINE BANNER (Triggered when flagged or crisis_resources_shown) */}
              {(report.crisis_resources_shown || report.overall_severity === 'flagged') && (
                <View style={styles.crisisBanner}>
                  <View style={styles.crisisHeaderRow}>
                    <Text style={styles.crisisAlertIcon}>🚨</Text>
                    <Text style={styles.crisisTitle}>Immediate Support & Crisis Resources</Text>
                  </View>
                  <Text style={styles.crisisSubtext}>
                    We detected expressions of acute distress. You are not alone—free, confidential help is available 24/7.
                  </Text>

                  <View style={styles.hotlineActions}>
                    <TouchableOpacity
                      style={styles.hotlineBtn}
                      onPress={() => handleCall('988')}
                    >
                      <Text style={styles.hotlineBtnMain}>📞 988 Lifeline</Text>
                      <Text style={styles.hotlineBtnSub}>Call or text 988 anytime</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.hotlineBtn, styles.hotlineBtnSecondary]}
                      onPress={() => handleCall('741741')}
                    >
                      <Text style={styles.hotlineBtnMain}>💬 Crisis Text Line</Text>
                      <Text style={styles.hotlineBtnSub}>Text HOME to 741741</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Overall Severity Card */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>OVERALL CLINICAL STATUS ({report.period})</Text>
                
                <View style={styles.statusRow}>
                  <View>
                    <Text style={styles.userIdText}>User: {report.anonymous_id}</Text>
                    <Text style={styles.decayScoreTitle}>
                      7-Day Decay Stress: {Math.round((report.overall_decay_score || 0) * 100)}%
                    </Text>
                  </View>
                  {(() => {
                    const badge = getSeverityStyle(report.overall_severity);
                    return (
                      <View style={[styles.sevBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.sevBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Gauge Meter */}
                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      {
                        width: `${Math.min(100, Math.max(5, (report.overall_decay_score || 0) * 100))}%`,
                        backgroundColor:
                          report.overall_severity === 'flagged' || report.overall_severity === 'high'
                            ? '#DC2626'
                            : report.overall_decay_score > 0.45
                            ? '#F59E0B'
                            : '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.decayExplanation}>
                  * Uses a 7-day half-life exponential moving average to smooth recent spikes vs. chronic stress patterns.
                </Text>
              </View>

              {/* Stressor Threads */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>ACTIVE STRESSOR THREADS</Text>
                {report.stressors && report.stressors.length > 0 ? (
                  report.stressors.map((th, i) => {
                    const trend = getTrendIcon(th.trend);
                    const sevStyle = getSeverityStyle(th.severity);
                    return (
                      <View key={i} style={styles.threadItem}>
                        <View style={styles.threadTop}>
                          <Text style={styles.threadCategory}>{th.category}</Text>
                          <View style={styles.trendRow}>
                            <Text style={[styles.trendText, { color: trend.color }]}>
                              {trend.icon} {trend.text}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.threadStats}>
                          <View style={[styles.threadSevBadge, { backgroundColor: sevStyle.bg }]}>
                            <Text style={[styles.threadSevBadgeText, { color: sevStyle.color }]}>
                              {sevStyle.label}
                            </Text>
                          </View>
                          <Text style={styles.threadStat}>Entries: {th.entry_count}</Text>
                          <Text style={styles.threadStat}>
                            Decay: {Math.round((th.current_decay_score || 0) * 100)}%
                          </Text>
                        </View>
                        {th.recent_triggers && th.recent_triggers.length > 0 && (
                          <View style={styles.triggersBox}>
                            <Text style={styles.triggersLabel}>Recent Triggers:</Text>
                            {th.recent_triggers.map((trigger, ti) => (
                              <View key={ti} style={styles.triggerPill}>
                                <Text style={styles.triggerText}>• {trigger}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {th.latest_reason && (!th.recent_triggers || th.recent_triggers.length === 0) && (
                          <View style={styles.triggersBox}>
                            <Text style={styles.triggersLabel}>Latest Trigger:</Text>
                            <View style={styles.triggerPill}>
                              <Text style={styles.triggerText}>• {th.latest_reason}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.mutedText}>No active stressor threads detected.</Text>
                )}
              </View>

              {/* Diary Entry Timeline */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>DIARY ENTRY TIMELINE</Text>
                <Text style={styles.diarySubtext}>
                  Chronological patient reflections with per-entry stress scores.
                </Text>
                {entries.length > 0 ? (
                  [...entries]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((entry, idx) => {
                      const score = Math.round((entry.stress_score || 0) * 100);
                      const scoreColor = score > 75 ? '#DC2626' : score > 45 ? '#D97706' : '#16A34A';
                      const dateStr = new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      });
                      const timeStr = new Date(entry.date).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit',
                      });
                      return (
                        <View key={entry.entry_id || idx} style={styles.entryItem}>
                          <View style={styles.entryHeader}>
                            <View>
                              <Text style={styles.entryDate}>{dateStr} · {timeStr}</Text>
                              <Text style={styles.entryCategory}>📂 {entry.category}</Text>
                            </View>
                            <View style={styles.entryScoreBadge}>
                              <Text style={[styles.entryScoreText, { color: scoreColor }]}>
                                {score}%
                              </Text>
                              <Text style={styles.entryScoreLabel}>stress</Text>
                            </View>
                          </View>
                          {entry.transcript && entry.transcript !== '[redacted]' && (
                            <Text style={styles.entryTranscript} numberOfLines={3}>
                              "{entry.transcript}"
                            </Text>
                          )}
                          {entry.transcript === '[redacted]' && (
                            <Text style={styles.entryRedacted}>
                              [Transcript redacted per retention policy]
                            </Text>
                          )}
                        </View>
                      );
                    })
                ) : (
                  <Text style={styles.mutedText}>No diary entries recorded yet.</Text>
                )}
              </View>
            </>
          ) : null}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B4423',
  },
  crisisBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  crisisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  crisisAlertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  crisisSubtext: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 14,
  },
  hotlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  hotlineBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  hotlineBtnSecondary: {
    backgroundColor: '#991B1B',
  },
  hotlineBtnMain: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 2,
  },
  hotlineBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
  },
  card: {
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8D633D',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userIdText: {
    fontSize: 13,
    color: '#7C522D',
    marginBottom: 2,
  },
  decayScoreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#382211',
  },
  sevBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sevBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gaugeTrack: {
    height: 10,
    backgroundColor: '#F3E8CE',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  decayExplanation: {
    fontSize: 11,
    color: '#8D633D',
    fontStyle: 'italic',
  },
  threadItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.06)',
    paddingVertical: 10,
  },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#382211',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  threadStats: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  threadStat: {
    fontSize: 12,
    color: '#7C522D',
  },
  threadSevBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  threadSevBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mutedText: {
    fontSize: 13,
    color: '#8D633D',
    fontStyle: 'italic',
  },
  // ─── Triggers ──────────────────────────────────
  triggersBox: {
    marginTop: 8,
    backgroundColor: '#FAF5EA',
    borderRadius: 8,
    padding: 10,
  },
  triggersLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#825C3C',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  triggerPill: {
    marginTop: 2,
  },
  triggerText: {
    fontSize: 12,
    color: '#5C3818',
    lineHeight: 18,
  },
  // ─── Diary Entry Timeline ─────────────────────
  diarySubtext: {
    fontSize: 12,
    color: '#7C522D',
    marginBottom: 12,
  },
  entryItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.06)',
    paddingVertical: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
  },
  entryCategory: {
    fontSize: 11,
    color: '#8D633D',
    marginTop: 2,
  },
  entryScoreBadge: {
    alignItems: 'center',
    minWidth: 48,
  },
  entryScoreText: {
    fontSize: 18,
    fontWeight: '800',
  },
  entryScoreLabel: {
    fontSize: 9,
    color: '#8D633D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryTranscript: {
    fontSize: 13,
    color: '#5C3818',
    fontStyle: 'italic',
    lineHeight: 19,
    backgroundColor: '#FAF5EA',
    borderRadius: 8,
    padding: 10,
  },
  entryRedacted: {
    fontSize: 12,
    color: '#A47B55',
    fontStyle: 'italic',
  },
});
