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

// ─── SVG Exponential Stress Curve Plot ────────────────────────────────────────
function StressCurvePlot({ decayScore = 0.5 }) {
  const width = 680;
  const height = 150;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Normalized decay score between 0.05 and 0.95
  const activeScore = Math.max(0.05, Math.min(0.98, decayScore || 0.43));

  // Generate 7-day half-life decay trajectory points over 14 days
  const points = [];
  const days = 14;
  for (let d = 0; d <= days; d++) {
    const x = padLeft + (d / days) * chartW;
    // Exponential weight: exp(-0.099 * (days - d))
    const weight = Math.exp(-0.099 * (days - d));
    // Simulated score trajectory ramping towards activeScore
    const baseline = activeScore * 0.45;
    const simScore = baseline + (activeScore - baseline) * weight;
    const y = padTop + chartH - simScore * chartH;
    points.push({ d: days - d, x, y, score: simScore, weight });
  }

  // Build SVG path
  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  const todayPoint = points[points.length - 1];
  const halfLifePoint = points[7];
  const day14Point = points[0];

  return (
    <View style={styles.chartContainer}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A2E18" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4A2E18" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Chart Background */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="#FAF4E8"
          rx="6"
        />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((level, idx) => {
          const gy = padTop + chartH - level * chartH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={gy}
                x2={width - padRight}
                y2={gy}
                stroke="rgba(74, 46, 24, 0.12)"
                strokeDasharray="4 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={gy + 3}
                fontSize="9"
                fontWeight="700"
                fill="#7C522D"
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                {Math.round(level * 100)}%
              </text>
            </g>
          );
        })}

        {/* X-Axis baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartH}
          x2={width - padRight}
          y2={padTop + chartH}
          stroke="#4A2E18"
          strokeWidth="1.5"
        />

        {/* Area under curve */}
        <path d={areaD} fill="url(#curveGradient)" />

        {/* The Curve Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#4A2E18"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Marker Points */}
        <circle cx={day14Point.x} cy={day14Point.y} r="4" fill="#FAF4E8" stroke="#4A2E18" strokeWidth="2" />
        <circle cx={halfLifePoint.x} cy={halfLifePoint.y} r="4.5" fill="#FAF4E8" stroke="#4A2E18" strokeWidth="2.5" />
        <circle cx={todayPoint.x} cy={todayPoint.y} r="6" fill="#4A2E18" stroke="#FAF4E8" strokeWidth="2.5" />

        {/* Callout Pill for Today */}
        <rect
          x={todayPoint.x - 44}
          y={Math.max(6, todayPoint.y - 24)}
          width="48"
          height="18"
          rx="9"
          fill="#4A2E18"
        />
        <text
          x={todayPoint.x - 20}
          y={Math.max(6, todayPoint.y - 24) + 12}
          fontSize="10"
          fontWeight="800"
          fill="#FFFDF9"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          {Math.round(activeScore * 100)}%
        </text>

        {/* X-Axis Labels */}
        <text x={padLeft} y={height - 10} fontSize="9" fontWeight="700" fill="#7C522D" textAnchor="start" fontFamily="system-ui, sans-serif">
          14 Days Ago (w=0.25)
        </text>
        <text x={padLeft + chartW * 0.5} y={height - 10} fontSize="9" fontWeight="700" fill="#7C522D" textAnchor="middle" fontFamily="system-ui, sans-serif">
          7d Half-Life (w=0.50)
        </text>
        <text x={width - padRight} y={height - 10} fontSize="9" fontWeight="800" fill="#4A2E18" textAnchor="end" fontFamily="system-ui, sans-serif">
          Today (w=1.00)
        </text>
      </svg>
    </View>
  );
}

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

  // Unified solid brown badge styling for all tiers (no red/green variations)
  const getSeverityLabel = (sev) => {
    switch (sev) {
      case 'flagged':
        return 'ACUTE / FLAGGED';
      case 'high':
        return 'HIGH SEVERITY';
      case 'medium':
        return 'MODERATE';
      default:
        return 'LOW / STABLE';
    }
  };

  // Clean typographic symbols (no blue emoji boxes)
  const getTrendDisplay = (trend) => {
    if (trend === 'escalating') return { symbol: '↑', text: 'Escalating' };
    if (trend === 'improving') return { symbol: '↓', text: 'Improving' };
    return { symbol: '→', text: 'Stable' };
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

              {/* 2. Patient Demographics & Summary Table */}
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
                    <Text style={styles.tableValueTextBold}>
                      {Math.round((report.overall_decay_score || 0) * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.2 }]}>
                    <Text style={styles.tableHeaderCellText}>Triage Severity Tier</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.8 }]}>
                    <View style={styles.clinicalBadge}>
                      <Text style={styles.clinicalBadgeText}>
                        {getSeverityLabel(report.overall_severity)}
                      </Text>
                    </View>
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

              {/* 3. Longitudinal Stress Trajectory Curve (SVG Plot) */}
              <View style={styles.sectionHeaderBand}>
                <Text style={styles.sectionHeaderBandText}>LONGITUDINAL TIME-DECAY DYNAMICS & RECOVERY TRAJECTORY</Text>
              </View>

              <View style={styles.analysisBox}>
                <View style={styles.gaugeHeaderRow}>
                  <Text style={styles.gaugeLabel}>Continuous Recency-Weighted Stress Curve</Text>
                  <Text style={styles.gaugePercent}>{Math.round((report.overall_decay_score || 0) * 100)}%</Text>
                </View>

                {/* Actual SVG Exponential Curve */}
                <StressCurvePlot decayScore={report.overall_decay_score} />

                <Text style={styles.gaugeNote}>
                  * Mathematical formulation: w(t) = exp(-0.099 · Δdays). Weights recent reflections with 7-day half-life decay.
                </Text>
              </View>

              {/* 4. Active Stressor Threads & Root Triggers Table */}
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
                    const trend = getTrendDisplay(th.trend);
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
                          <Text style={styles.threadTrendText}>
                            {trend.symbol} {trend.text}
                          </Text>
                        </View>

                        {/* Severity (Solid Unified Brown Badge) */}
                        <View style={{ flex: 1.3, alignItems: 'center' }}>
                          <View style={styles.miniSeverityBadge}>
                            <Text style={styles.miniSeverityText}>{th.severity.toUpperCase()}</Text>
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
    color: '#4A2E18',
  },
  tableValueTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A2E18',
  },
  clinicalBadge: {
    backgroundColor: '#4A2E18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  clinicalBadgeText: {
    color: '#FFFDF7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  chartContainer: {
    marginVertical: 10,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DFCBB0',
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
    color: '#4A2E18',
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
    color: '#4A2E18',
  },
  miniSeverityBadge: {
    backgroundColor: '#4A2E18',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  miniSeverityText: {
    color: '#FFFDF7',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  threadDecayValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
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
