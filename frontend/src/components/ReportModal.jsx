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
        return { color: '#991B1B', bg: '#FEE2E2', border: '#EF4444', label: 'ACUTE / FLAGGED' };
      case 'high':
        return { color: '#C2410C', bg: '#FFEDD5', border: '#F97316', label: 'HIGH SEVERITY' };
      case 'medium':
        return { color: '#92400E', bg: '#FEF3C7', border: '#F59E0B', label: 'MODERATE' };
      default:
        return { color: '#166534', bg: '#DCFCE7', border: '#22C55E', label: 'LOW / STABLE' };
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'escalating') return { icon: '↗️', text: 'Escalating', color: '#DC2626' };
    if (trend === 'improving') return { icon: '↘️', text: 'Improving', color: '#16A34A' };
    return { icon: '➡️', text: 'Stable', color: '#D97706' };
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Floating Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Diagnostic Clinical Assessment</Text>
          <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
            <Text style={styles.printBtnText}>🖨️ Print / Save A4</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Synthesizing longitudinal stress analytics...</Text>
            </View>
          ) : report ? (
            /* ─── A4 Document Container ─── */
            <View style={styles.a4Sheet}>

              {/* 1. Official Clinical Document Header */}
              <View style={styles.docHeader}>
                <View style={styles.docHeaderLeft}>
                  <Text style={styles.docHospitalName}>BREADCRUMBS CLINICAL SANCTUARY</Text>
                  <Text style={styles.docReportTitle}>Longitudinal Stress & Triage Assessment</Text>
                  <Text style={styles.docSubheader}>Clinical Care Management • Confidential Provider Copy</Text>
                </View>
                <View style={styles.docHeaderRight}>
                  <View style={styles.hospitalLogoBox}>
                    <Text style={styles.hospitalLogoIcon}>✚</Text>
                  </View>
                  <Text style={styles.docAuthLabel}>VERIFIED CLINICAL RECORD</Text>
                </View>
              </View>

              {/* 2. Patient Demographics & Summary Table (Image 1 Inspiration) */}
              <View style={styles.sectionHeaderBand}>
                <Text style={styles.sectionHeaderBandText}>PATIENT DEMOGRAPHICS & CLINICAL METRICS</Text>
              </View>

              <View style={styles.tableGrid}>
                {/* Row 1 */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Patient ID</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <Text style={styles.tableValueTextBold}>{report.anonymous_id}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Evaluation Window</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <Text style={styles.tableValueText}>{report.period || 'Last 14 Days'}</Text>
                  </View>
                </View>

                {/* Row 2 */}
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>7-Day Decay Stress</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <Text style={[styles.tableValueTextBold, { color: '#4A2E18' }]}>
                      {Math.round((report.overall_decay_score || 0) * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Triage Severity Tier</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    {(() => {
                      const badge = getSeverityStyle(report.overall_severity);
                      return (
                        <View style={[styles.clinicalBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.clinicalBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>

                {/* Row 3 */}
                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Total Reflections</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <Text style={styles.tableValueText}>
                      {report.stressors ? report.stressors.reduce((acc, s) => acc + (s.entry_count || 0), 0) : 0} logs
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Active Topic Clusters</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <Text style={styles.tableValueText}>{report.stressors ? report.stressors.length : 0} semantic threads</Text>
                  </View>
                </View>
              </View>

              {/* 3. Longitudinal Stress Trajectory Gauge & Analysis */}
              <View style={styles.sectionHeaderBand}>
                <Text style={styles.sectionHeaderBandText}>LONGITUDINAL TIME-DECAY DYNAMICS & RECOVERY TRAJECTORY</Text>
              </View>

              <View style={styles.analysisBox}>
                <View style={styles.gaugeHeaderRow}>
                  <Text style={styles.gaugeLabel}>Continuous Recency-Weighted Stress Curve</Text>
                  <Text style={styles.gaugePercent}>{Math.round((report.overall_decay_score || 0) * 100)}%</Text>
                </View>

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
                            ? '#D97706'
                            : '#16A34A',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.gaugeNote}>
                  * Mathematical weighting: w(t) = exp(-0.099 · Δdays). Weights recent reflections with 7-day half-life decay.
                </Text>
              </View>

              {/* 4. Active Stressor Threads & Root Triggers Table (Images 1 & 2 Inspiration) */}
              <View style={styles.sectionHeaderBand}>
                <Text style={styles.sectionHeaderBandText}>ACTIVE STRESSOR THREADS & NLP ROOT TRIGGER DIAGNOSTICS</Text>
              </View>

              {report.stressors && report.stressors.length > 0 ? (
                <View style={styles.threadsTable}>
                  {/* Table Column Header */}
                  <View style={styles.threadsTableHeaderRow}>
                    <Text style={[styles.threadsTableHeaderText, { flex: 2.2 }]}>STRESSOR DOMAIN</Text>
                    <Text style={[styles.threadsTableHeaderText, { flex: 1.5, textAlign: 'center' }]}>TRAJECTORY</Text>
                    <Text style={[styles.threadsTableHeaderText, { flex: 1.3, textAlign: 'center' }]}>SEVERITY</Text>
                    <Text style={[styles.threadsTableHeaderText, { flex: 1.2, textAlign: 'center' }]}>DECAY %</Text>
                    <Text style={[styles.threadsTableHeaderText, { flex: 3.8 }]}>NLP EXTRACTED ROOT TRIGGERS</Text>
                  </View>

                  {/* Table Rows */}
                  {report.stressors.map((th, i) => {
                    const trend = getTrendIcon(th.trend);
                    const sevStyle = getSeverityStyle(th.severity);
                    const isSubThread = th.category && th.category.includes('#');
                    const cleanCategoryName = isSubThread ? th.category.split('#')[0] : th.category;
                    const subThreadIndex = isSubThread ? `#${th.category.split('#')[1]}` : null;
                    const isEven = i % 2 === 0;

                    return (
                      <View key={i} style={[styles.threadTableRow, isEven && styles.threadTableRowEven]}>
                        {/* Domain */}
                        <View style={{ flex: 2.2 }}>
                          <Text style={styles.threadDomainName}>{cleanCategoryName}</Text>
                          {subThreadIndex ? (
                            <Text style={styles.threadSubLabel}>Sub-Cluster {subThreadIndex}</Text>
                          ) : (
                            <Text style={styles.threadSubLabel}>{th.entry_count} reflections</Text>
                          )}
                        </View>

                        {/* Trajectory */}
                        <View style={{ flex: 1.5, alignItems: 'center' }}>
                          <Text style={[styles.threadTrendText, { color: trend.color }]}>
                            {trend.icon} {trend.text}
                          </Text>
                        </View>

                        {/* Severity */}
                        <View style={{ flex: 1.3, alignItems: 'center' }}>
                          <View style={[styles.miniSeverityBadge, { backgroundColor: sevStyle.bg, borderColor: sevStyle.border }]}>
                            <Text style={[styles.miniSeverityText, { color: sevStyle.color }]}>{th.severity.toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* Decay % */}
                        <View style={{ flex: 1.2, alignItems: 'center' }}>
                          <Text style={styles.threadDecayValue}>
                            {Math.round((th.current_decay_score || 0) * 100)}%
                          </Text>
                        </View>

                        {/* NLP Root Triggers */}
                        <View style={{ flex: 3.8, paddingLeft: 8 }}>
                          {th.recent_triggers && th.recent_triggers.length > 0 ? (
                            th.recent_triggers.map((trigger, ti) => (
                              <Text key={ti} style={styles.triggerListItem}>
                                • "{trigger}"
                              </Text>
                            ))
                          ) : th.latest_reason ? (
                            <Text style={styles.triggerListItem}>
                              • "{th.latest_reason}"
                            </Text>
                          ) : (
                            <Text style={styles.triggerListEmpty}>No specific triggers flagged</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No active clinical stressor threads identified for this period.</Text>
                </View>
              )}

              {/* 5. Document Footer & Attestation */}
              <View style={styles.docFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.footerDisclaimer}>
                    CONFIDENTIALITY NOTICE: This document contains clinical decompression insights for authorized mental health professionals only.
                  </Text>
                  <Text style={styles.footerDocId}>
                    DOCUMENT ID: BC-DIAG-{report.anonymous_id.toUpperCase()}-{new Date().toISOString().slice(0, 10)}
                  </Text>
                </View>
                <View style={styles.footerRight}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>Attending Clinician Signature / Date</Text>
                </View>
              </View>

            </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#EFE1CD',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.12)',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.2)',
    cursor: 'pointer',
  },
  closeBtnText: {
    fontSize: 12,
    color: '#4A2E18',
    fontWeight: '700',
  },
  printBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#4A2E18',
    cursor: 'pointer',
  },
  printBtnText: {
    fontSize: 12,
    color: '#FFFDF9',
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B4423',
    fontStyle: 'italic',
  },

  // ─── A4 Sheet Paper ───────────────────────────
  a4Sheet: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFD0B8',
    borderRadius: 6,
    padding: 32,
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 40,
  },

  // ─── Header ───────────────────────────────────
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A2E18',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 16,
  },
  docHeaderLeft: {
    flex: 1,
  },
  docHospitalName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F7ECCD',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  docReportTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Fraunces',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  docSubheader: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
  },
  docHeaderRight: {
    alignItems: 'center',
    marginLeft: 16,
  },
  hospitalLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#F7ECCD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hospitalLogoIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A2E18',
  },
  docAuthLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#F7ECCD',
    letterSpacing: 0.6,
  },

  // ─── Section Header Band ──────────────────────
  sectionHeaderBand: {
    backgroundColor: '#EFE1CD',
    borderWidth: 1,
    borderColor: '#DFCBB0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 16,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sectionHeaderBandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5C3818',
    letterSpacing: 0.8,
  },

  // ─── Demographics & Metrics Table ─────────────
  tableGrid: {
    borderWidth: 1,
    borderColor: '#DFCBB0',
    borderTopWidth: 0,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DFCBB0',
    minHeight: 34,
    alignItems: 'center',
  },
  tableCell: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#DFCBB0',
    justifyContent: 'center',
  },
  tableHeaderCell: {
    backgroundColor: '#FAF4E8',
  },
  tableHeaderCellText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C522D',
  },
  tableValueText: {
    fontSize: 12,
    color: '#382211',
  },
  tableValueTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A2E18',
  },
  clinicalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  clinicalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ─── Longitudinal Gauge & Analysis Box ────────
  analysisBox: {
    borderWidth: 1,
    borderColor: '#DFCBB0',
    borderTopWidth: 0,
    padding: 16,
    backgroundColor: '#FFFDF9',
    marginBottom: 6,
  },
  gaugeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
  },
  gaugePercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4A2E18',
  },
  gaugeTrack: {
    height: 10,
    backgroundColor: '#EFE1CD',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeNote: {
    fontSize: 10,
    color: '#8D633D',
    fontStyle: 'italic',
  },

  // ─── Active Stressor Threads Table ────────────
  threadsTable: {
    borderWidth: 1,
    borderColor: '#DFCBB0',
    borderTopWidth: 0,
    marginBottom: 16,
  },
  threadsTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF2E4',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DFCBB0',
    alignItems: 'center',
  },
  threadsTableHeaderText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D4330',
    letterSpacing: 0.5,
  },
  threadTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.08)',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  threadTableRowEven: {
    backgroundColor: '#FCFAF6',
  },
  threadDomainName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#382211',
  },
  threadSubLabel: {
    fontSize: 10,
    color: '#8D633D',
    marginTop: 2,
    fontStyle: 'italic',
  },
  threadTrendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniSeverityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniSeverityText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  threadDecayValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#382211',
  },
  triggerListItem: {
    fontSize: 11,
    color: '#5C3818',
    lineHeight: 16,
    marginBottom: 2,
  },
  triggerListEmpty: {
    fontSize: 11,
    color: '#A89279',
    fontStyle: 'italic',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#DFCBB0',
    borderTopWidth: 0,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    color: '#8D633D',
    fontStyle: 'italic',
  },

  // ─── Footer & Signature ───────────────────────
  docFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DFCBB0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flex: 1,
    marginRight: 24,
  },
  footerDisclaimer: {
    fontSize: 9,
    color: '#8D633D',
    lineHeight: 13,
    marginBottom: 6,
  },
  footerDocId: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6D4330',
    letterSpacing: 0.5,
  },
  footerRight: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: '#4A2E18',
    marginBottom: 6,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#7C522D',
    fontStyle: 'italic',
  },
});
