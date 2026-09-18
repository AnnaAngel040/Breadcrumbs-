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
import { fetchUserReport, fetchTherapistPatientReport } from '../services/api';

export default function ReportModal({ visible, onClose, userId, therapistId = null }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      const reportPromise = therapistId
        ? fetchTherapistPatientReport(therapistId, userId)
        : fetchUserReport(userId);

      reportPromise.then((rep) => {
        setReport(rep);
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
              {/* Overall Severity Card */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>OVERALL CLINICAL STATUS ({report.period})</Text>
                
                <View style={styles.statusRow}>
                  <View>
                    <Text style={styles.userIdText}>Patient ID: <Text style={{ fontWeight: '700', color: '#4A2E18' }}>{report.anonymous_id}</Text></Text>
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
                  * Uses a 7-day half-life exponential moving average: weight(t) = exp(-0.099 · Δdays).
                </Text>

                {/* Quick Clinical Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricCellLabel}>ACTIVE TOPICS</Text>
                    <Text style={styles.metricCellValue}>{report.stressors ? report.stressors.length : 0}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricCellLabel}>TOTAL REFLECTIONS</Text>
                    <Text style={styles.metricCellValue}>
                      {report.stressors ? report.stressors.reduce((acc, s) => acc + (s.entry_count || 0), 0) : 0}
                    </Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricCellLabel}>PRIMARY SEVERITY</Text>
                    <Text style={[styles.metricCellValue, { color: getSeverityStyle(report.overall_severity).color }]}>
                      {report.overall_severity ? report.overall_severity.toUpperCase() : 'LOW'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stressor Threads */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>ACTIVE STRESSOR THREADS (SEMANTIC CLUSTERING)</Text>
                {report.stressors && report.stressors.length > 0 ? (
                  report.stressors.map((th, i) => {
                    const trend = getTrendIcon(th.trend);
                    const sevStyle = getSeverityStyle(th.severity);
                    const isSubThread = th.category && th.category.includes('#');
                    const cleanCategoryName = isSubThread ? th.category.split('#')[0] : th.category;
                    const subThreadIndex = isSubThread ? `#${th.category.split('#')[1]}` : null;

                    return (
                      <View key={i} style={styles.threadItem}>
                        <View style={styles.threadTop}>
                          <View style={styles.categoryTitleRow}>
                            <Text style={styles.threadCategory}>{cleanCategoryName}</Text>
                            {subThreadIndex && (
                              <View style={styles.subThreadPill}>
                                <Text style={styles.subThreadPillText}>Topic {subThreadIndex}</Text>
                              </View>
                            )}
                          </View>
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
                          <Text style={styles.threadStat}>Reflections: <Text style={styles.statBold}>{th.entry_count}</Text></Text>
                          <Text style={styles.threadStat}>
                            7-Day Decay: <Text style={styles.statBold}>{Math.round((th.current_decay_score || 0) * 100)}%</Text>
                          </Text>
                          {th.latest_score !== undefined && (
                            <Text style={styles.threadStat}>
                              Latest Raw: <Text style={styles.statBold}>{Math.round(th.latest_score * 100)}%</Text>
                            </Text>
                          )}
                        </View>
                        {th.recent_triggers && th.recent_triggers.length > 0 && (
                          <View style={styles.triggersBox}>
                            <Text style={styles.triggersLabel}>NLP Extracted Root Triggers:</Text>
                            {th.recent_triggers.map((trigger, ti) => (
                              <View key={ti} style={styles.triggerPill}>
                                <Text style={styles.triggerText}>• "{trigger}"</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {th.latest_reason && (!th.recent_triggers || th.recent_triggers.length === 0) && (
                          <View style={styles.triggersBox}>
                            <Text style={styles.triggersLabel}>NLP Extracted Root Trigger:</Text>
                            <View style={styles.triggerPill}>
                              <Text style={styles.triggerText}>• "{th.latest_reason}"</Text>
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
  // ─── Metrics Grid ─────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#FAF5EA',
    borderRadius: 12,
    padding: 10,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCellLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8D633D',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricCellValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A2E18',
  },
  // ─── Sub-Thread Styles ────────────────────────
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subThreadPill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subThreadPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  statBold: {
    fontWeight: '700',
    color: '#4A2E18',
  },
});
