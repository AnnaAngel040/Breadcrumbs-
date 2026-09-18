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
import { fetchUserReport, fetchTherapists } from '../services/api';

export default function ReportModal({ visible, onClose, userId }) {
  const [report, setReport] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchUserReport(userId).then(async (rep) => {
        setReport(rep);
        const topCat = rep.stressors && rep.stressors.length > 0 ? rep.stressors[0].category : 'Work/Career';
        const thList = await fetchTherapists(userId, topCat);
        setTherapists(thList);
        setLoading(false);
      });
    }
  }, [visible, userId]);

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
                          <Text style={styles.threadStat}>Entries: {th.entry_count}</Text>
                          <Text style={styles.threadStat}>
                            Decay: {Math.round((th.current_decay_score || 0) * 100)}%
                          </Text>
                          <Text style={styles.threadStat}>Severity: {th.severity}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.mutedText}>No active stressor threads detected.</Text>
                )}
              </View>

              {/* Matched Therapists */}
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>RECOMMENDED CLINICIANS & SPECIALISTS</Text>
                <Text style={styles.clinicianSub}>
                  Matched by clinical category, severity tier suitability, and proximity.
                </Text>

                {therapists.map((t, idx) => (
                  <View key={t.id || idx} style={styles.therapistCard}>
                    <View style={styles.therapistHeader}>
                      <Text style={styles.therapistName}>{t.name}</Text>
                      <Text style={styles.ratingText}>★ {t.rating}</Text>
                    </View>
                    <Text style={styles.therapistSpecialty}>Focus: {t.specialty}</Text>
                    <Text style={styles.therapistLocation}>
                      📍 {t.address} {t.distance_km ? `(${t.distance_km} km away)` : '(Telehealth)'}
                    </Text>
                    <View style={styles.tagRow}>
                      {t.modes && t.modes.map((m, mi) => (
                        <View key={mi} style={styles.modeTag}>
                          <Text style={styles.modeTagText}>{m.toUpperCase()}</Text>
                        </View>
                      ))}
                      <View style={[styles.modeTag, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={[styles.modeTagText, { color: '#6D28D9' }]}>
                          MATCH {Math.round((t.match_score || 1.5) * 50)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
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
    gap: 14,
  },
  threadStat: {
    fontSize: 12,
    color: '#7C522D',
  },
  mutedText: {
    fontSize: 13,
    color: '#8D633D',
    fontStyle: 'italic',
  },
  clinicianSub: {
    fontSize: 12,
    color: '#7C522D',
    marginBottom: 12,
  },
  therapistCard: {
    backgroundColor: '#FAF5EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.05)',
  },
  therapistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  therapistName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#382211',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  therapistSpecialty: {
    fontSize: 12,
    color: '#6B4423',
    marginBottom: 2,
  },
  therapistLocation: {
    fontSize: 11,
    color: '#8D633D',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
});
