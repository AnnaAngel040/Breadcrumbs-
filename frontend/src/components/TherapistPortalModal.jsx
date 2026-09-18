import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { getTherapistPatients, linkTherapistPatient } from '../services/api';
import ReportModal from './ReportModal';

export default function TherapistPortalModal({
  onClose,
  therapistId = 'th_chen',
  therapistAccount = null,
  onSelectPatient, // ({ user_id, display_name }) => void
}) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportPatientId, setSelectedReportPatientId] = useState(null);
  const [linkPatientId, setLinkPatientId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState({ type: '', message: '' });

  const refreshPatients = () => {
    setLoading(true);
    getTherapistPatients(therapistId).then((data) => {
      setPatients(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshPatients();
  }, [therapistId]);

  const handleLinkPatient = async () => {
    const pid = linkPatientId.trim();
    if (!pid) {
      setLinkFeedback({ type: 'error', message: 'Please enter a Patient ID.' });
      return;
    }

    // Check if already linked
    if (patients.some((p) => p.patient_id === pid)) {
      setLinkFeedback({ type: 'error', message: `"${pid}" is already linked to your caseload.` });
      return;
    }

    setLinkLoading(true);
    setLinkFeedback({ type: '', message: '' });

    try {
      await linkTherapistPatient(therapistId, pid);
      setLinkPatientId('');
      setLinkFeedback({ type: 'success', message: `✓ Patient "${pid}" linked successfully.` });
      refreshPatients();
      setTimeout(() => setLinkFeedback({ type: '', message: '' }), 4000);
    } catch (err) {
      setLinkFeedback({ type: 'error', message: err.message || 'Failed to link patient.' });
    } finally {
      setLinkLoading(false);
    }
  };

  const getSeverityBadge = (sev) => {
    if (sev === 'flagged') return { bg: '#FEE2E2', color: '#B91C1C', text: 'ACUTE / FLAGGED' };
    if (sev === 'high') return { bg: '#FFEDD5', color: '#C2410C', text: 'HIGH SEVERITY' };
    return { bg: '#DCFCE7', color: '#15803D', text: 'LOW / RECOVERY' };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinician Workspace</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Provider Banner */}
      <View style={styles.providerBanner}>
        <Text style={styles.providerId}>
          Licensed Provider: {therapistAccount?.display_name || therapistId}
        </Text>
        <Text style={styles.providerSub}>Active Clinical Caseload & Triage Dashboard</Text>
      </View>

      {/* Patient List */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Link a New Patient */}
        <View style={styles.linkCard}>
          <Text style={styles.sectionTitle}>LINK A PATIENT</Text>
          <Text style={styles.linkDescription}>
            Enter a patient's ID to add them to your clinical caseload and access their stress reports.
          </Text>
          <View style={styles.linkInputRow}>
            <TextInput
              style={styles.linkInput}
              placeholder="Enter Patient ID (e.g. maya_24)"
              placeholderTextColor="#A47B55"
              value={linkPatientId}
              onChangeText={(text) => {
                setLinkPatientId(text);
                if (linkFeedback.message) setLinkFeedback({ type: '', message: '' });
              }}
              autoCapitalize="none"
              editable={!linkLoading}
              onSubmitEditing={handleLinkPatient}
            />
            <TouchableOpacity
              style={[styles.linkBtn, linkLoading && styles.linkBtnDisabled]}
              onPress={handleLinkPatient}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <ActivityIndicator size="small" color="#FFFDF9" />
              ) : (
                <Text style={styles.linkBtnText}>+ Link</Text>
              )}
            </TouchableOpacity>
          </View>
          {linkFeedback.message ? (
            <View
              style={[
                styles.linkFeedback,
                linkFeedback.type === 'error' ? styles.linkFeedbackError : styles.linkFeedbackSuccess,
              ]}
            >
              <Text
                style={[
                  styles.linkFeedbackText,
                  { color: linkFeedback.type === 'error' ? '#991B1B' : '#15803D' },
                ]}
              >
                {linkFeedback.type === 'error' ? '⚠️' : ''} {linkFeedback.message}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>LINKED PATIENT TRIAGE</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color="#6D4330" />
        ) : patients.length === 0 ? (
          <Text style={styles.emptyText}>No patients linked to this account.</Text>
        ) : (
          patients.map((p) => {
            const badge = getSeverityBadge(p.overall_severity);
            return (
              <View key={p.patient_id} style={styles.patientCard}>
                <View style={styles.patientTop}>
                  <View>
                    <Text style={styles.patientName}>{p.display_name || p.patient_id}</Text>
                    <Text style={styles.patientIdTag}>ID: {p.patient_id}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>

                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>7-Day Decay Stress</Text>
                    <Text style={styles.statValue}>
                      {Math.round((p.overall_decay_score || 0) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Active Stressors</Text>
                    <Text style={styles.statValue}>{p.active_stressor_count}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Crisis Trigger</Text>
                    <Text
                      style={[
                        styles.statValue,
                        { color: p.crisis_resources_shown ? '#DC2626' : '#16A34A' },
                      ]}
                    >
                      {p.crisis_resources_shown ? 'ACTIVE 🚨' : 'None'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewReportBtn}
                  onPress={() => setSelectedReportPatientId(p.patient_id)}
                >
                  <Text style={styles.viewReportBtnText}>📊 View Full Patient Report →</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Embedded Full Clinical Report Modal for Therapist */}
      {selectedReportPatientId && (
        <ReportModal
          visible={!!selectedReportPatientId}
          onClose={() => setSelectedReportPatientId(null)}
          userId={selectedReportPatientId}
          therapistId={therapistId}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDF7F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.08)',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 46, 24, 0.08)',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#4A2E18',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  providerBanner: {
    backgroundColor: '#F5EBE1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.06)',
  },
  providerId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
  },
  providerSub: {
    fontSize: 12,
    color: '#825C3C',
  },
  content: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#825C3C',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8D633D',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
  patientCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  patientTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#382211',
  },
  patientIdTag: {
    fontSize: 12,
    color: '#8D633D',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF2E8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#8D633D',
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
  },
  viewReportBtn: {
    backgroundColor: '#6D4330',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewReportBtnText: {
    color: '#FFFDF9',
    fontSize: 12,
    fontWeight: '700',
  },
  // ─── Link Patient Form ──────────────────────
  linkCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  linkDescription: {
    fontSize: 12,
    color: '#8D633D',
    marginBottom: 12,
    lineHeight: 17,
  },
  linkInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#FAF2E8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#382211',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.12)',
  },
  linkBtn: {
    backgroundColor: '#6D4330',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  linkBtnDisabled: {
    opacity: 0.6,
  },
  linkBtnText: {
    color: '#FFFDF9',
    fontSize: 13,
    fontWeight: '700',
  },
  linkFeedback: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  linkFeedbackError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  linkFeedbackSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  linkFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
