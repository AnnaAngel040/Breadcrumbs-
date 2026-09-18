import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { deleteUserData } from '../services/api';

export default function ProfileModal({
  visible,
  onClose,
  userId,
  account,
  onOpenReport,
  onSignOut,
  backendOnline,
  onSwitchPersona,
}) {
  const [deleteMessage, setDeleteMessage] = useState('');
  const displayName = account?.display_name || userId;
  const role = account?.role || (userId?.startsWith('th_') ? 'therapist' : 'patient');
  const email = account?.email || `${userId}@breadcrumbs.internal`;

  const handleDelete = async () => {
    const success = await deleteUserData(userId);
    if (success) {
      setDeleteMessage(`All check-ins and reflection records for "${displayName}" have been permanently erased.`);
      setTimeout(() => setDeleteMessage(''), 4000);
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
          <Text style={styles.headerTitle}>Account & Privacy</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Backend Connection Status */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: backendOnline ? '#16A34A' : '#D97706' },
              ]}
            />
            <Text style={styles.statusText}>
              Backend: {backendOnline ? 'Connected (Live SQLite Database)' : 'Offline (Local Simulated Mode)'}
            </Text>
          </View>

          {/* User Account Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileUsername}>@{userId}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {role === 'therapist' ? '🩺 Clinician / Provider' : '🤎 Individual / Member'}
                  </Text>
                </View>
              </View>
            </View>

            {email ? (
              <View style={styles.emailRow}>
                <Text style={styles.emailLabel}>Registered Email:</Text>
                <Text style={styles.emailValue}>{email}</Text>
              </View>
            ) : null}

            {/* Clinical Privacy Confirmation */}
            <View style={styles.privacyShieldBox}>
              <Text style={styles.privacyShieldIcon}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyShieldTitle}>Clinical Privacy Shield Active</Text>
                <Text style={styles.privacyShieldDesc}>
                  Raw diagnostic stress metrics & longitudinal curves are protected and shared solely with your authorized therapist for clinical care.
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy & Right to Delete */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>🔒 Privacy & Right-to-Delete</Text>
            <Text style={styles.privacyDesc}>
              Under strict clinical privacy ethics, you can permanently erase every recorded entry, transcript, and stress metric associated with your account at any time.
            </Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Permanently Delete My Diary Data</Text>
            </TouchableOpacity>
            {deleteMessage ? (
              <View style={styles.deleteSuccessBox}>
                <Text style={styles.deleteSuccessText}>✓ {deleteMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Active Testing Persona Switcher */}
          {onSwitchPersona ? (
            <View style={styles.personaCard}>
              <Text style={styles.personaTitle}>🎭 Active Clinical Persona Switcher</Text>
              <Text style={styles.personaDesc}>
                Quickly switch your active profile to test different stress trajectory curves:
              </Text>
              <View style={styles.personaGrid}>
                <TouchableOpacity
                  style={[
                    styles.personaBtn,
                    userId === 'demo_escalating' && styles.personaBtnActive,
                  ]}
                  onPress={() =>
                    onSwitchPersona({
                      user_id: 'demo_escalating',
                      display_name: 'Alex Rivera',
                      role: 'patient',
                      email: 'alex@example.com',
                    })
                  }
                >
                  <Text style={styles.personaBtnTitle}>Alex</Text>
                  <Text style={styles.personaBtnSub}>Escalating</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.personaBtn,
                    userId === 'demo_improving' && styles.personaBtnActive,
                  ]}
                  onPress={() =>
                    onSwitchPersona({
                      user_id: 'demo_improving',
                      display_name: 'Jordan Taylor',
                      role: 'patient',
                      email: 'jordan@example.com',
                    })
                  }
                >
                  <Text style={styles.personaBtnTitle}>Jordan</Text>
                  <Text style={styles.personaBtnSub}>Improving</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.personaBtn,
                    userId === 'demo_flagged' && styles.personaBtnActive,
                    { borderColor: '#DC2626' },
                  ]}
                  onPress={() =>
                    onSwitchPersona({
                      user_id: 'demo_flagged',
                      display_name: 'Sam Harper',
                      role: 'patient',
                      email: 'sam@example.com',
                    })
                  }
                >
                  <Text style={[styles.personaBtnTitle, { color: '#B91C1C' }]}>Sam</Text>
                  <Text style={styles.personaBtnSub}>Flagged Alert</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Sign Out Button */}
          {onSignOut ? (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => {
                onClose();
                onSignOut();
              }}
            >
              <Text style={styles.signOutBtnText}>🚪 Sign Out & Switch Account</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6EAC9',
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F6EAC9',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.08)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAD7B5',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#4A2E18',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F6EAC9',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#F6EAC9',
    minHeight: '100%',
    flexGrow: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6B4423',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAD7B5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 46, 24, 0.15)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  profileUsername: {
    fontSize: 12,
    color: '#8D633D',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4E3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D4330',
  },
  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.06)',
  },
  emailLabel: {
    fontSize: 12,
    color: '#8D633D',
  },
  emailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A2E18',
  },
  privacyShieldBox: {
    backgroundColor: '#F7EFE3',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
  },
  privacyShieldIcon: {
    fontSize: 20,
  },
  privacyShieldTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 2,
  },
  privacyShieldDesc: {
    fontSize: 11,
    color: '#7C522D',
    lineHeight: 15,
  },
  privacyCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 6,
  },
  privacyDesc: {
    fontSize: 12,
    color: '#7C522D',
    lineHeight: 18,
    marginBottom: 14,
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    cursor: 'pointer',
  },
  deleteBtnText: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteSuccessBox: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  deleteSuccessText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    textAlign: 'center',
  },
  personaCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  personaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 4,
  },
  personaDesc: {
    fontSize: 12,
    color: '#7C522D',
    lineHeight: 18,
    marginBottom: 12,
  },
  personaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  personaBtn: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 46, 24, 0.12)',
    alignItems: 'center',
    cursor: 'pointer',
  },
  personaBtnActive: {
    backgroundColor: '#F7EBD6',
    borderColor: '#6D4330',
  },
  personaBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 2,
  },
  personaBtnSub: {
    fontSize: 10,
    color: '#8D633D',
  },
  signOutBtn: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C522D',
  },
});
