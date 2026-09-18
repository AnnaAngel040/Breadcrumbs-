import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { getTherapistPatients } from '../services/api';

export default function TherapistPortalModal({
  onClose,
  therapistId = 'th_chen',
  therapistAccount = null,
  onSelectPatient, // ({ user_id, display_name }) => void
}) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTherapistPatients(therapistId).then((data) => {
      setPatients(data);
      setLoading(false);
    });
  }, [therapistId]);

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
                  onPress={() =>
                    onSelectPatient({
                      user_id: p.patient_id,
                      display_name: p.display_name || p.patient_id,
                    })
                  }
                >
                  <Text style={styles.viewReportBtnText}>Open Patient Hero Screen →</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
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
});
