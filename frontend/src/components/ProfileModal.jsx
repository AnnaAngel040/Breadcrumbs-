import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { deleteUserData } from '../services/api';

export default function ProfileModal({
  visible,
  onClose,
  userId,
  onSelectUser,
  onOpenReport,
  onSignOut,
  backendOnline,
}) {
  const [customInput, setCustomInput] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');

  const personas = [
    {
      id: 'demo_escalating',
      title: 'Escalating Stress Persona',
      desc: 'Work deadlines piling up; high severity curve',
      tag: 'High Severity',
      color: '#DC2626',
    },
    {
      id: 'demo_improving',
      title: 'Recovery Persona',
      desc: 'Family strain resolving; steady improvement',
      tag: 'Improving',
      color: '#16A34A',
    },
    {
      id: 'demo_flagged',
      title: 'Acute Crisis Persona',
      desc: 'Acute distress keywords; triggers immediate crisis banner',
      tag: 'Immediate Crisis',
      color: '#991B1B',
    },
  ];

  const handleDelete = async () => {
    const success = await deleteUserData(userId);
    if (success) {
      setDeleteMessage(`All data for "${userId}" has been permanently erased.`);
      setTimeout(() => setDeleteMessage(''), 3500);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User & Privacy</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          {/* Backend Status */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: backendOnline ? '#16A34A' : '#D97706' },
              ]}
            />
            <Text style={styles.statusText}>
              Backend: {backendOnline ? 'Connected (http://127.0.0.1:8000)' : 'Offline (Simulated Client Mode)'}
            </Text>
          </View>

          {/* Current Active User */}
          <View style={styles.currentCard}>
            <Text style={styles.label}>ACTIVE PERSONA</Text>
            <Text style={styles.currentUserId}>{userId}</Text>
            <View style={[styles.reportActionBtn, { backgroundColor: '#E8DCCC' }]}>
              <Text style={[styles.reportActionText, { color: '#5C3818' }]}>🌿 Reflections are being safely recorded</Text>
            </View>
          </View>

          {/* Persona Switcher */}
          <Text style={styles.sectionHeader}>SWITCH CLINICAL DEMO PERSONA</Text>
          {personas.map((p) => {
            const isSelected = p.id === userId;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.personaCard, isSelected && styles.personaCardSelected]}
                onPress={() => onSelectUser(p.id)}
              >
                <View style={styles.personaTop}>
                  <Text style={[styles.personaTitle, isSelected && styles.selectedText]}>
                    {p.title}
                  </Text>
                  <View style={[styles.personaTag, { backgroundColor: p.color + '20' }]}>
                    <Text style={[styles.personaTagText, { color: p.color }]}>{p.tag}</Text>
                  </View>
                </View>
                <Text style={styles.personaDesc}>{p.desc}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom User ID */}
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Or enter custom user_id..."
              placeholderTextColor="#8D633D"
              value={customInput}
              onChangeText={setCustomInput}
            />
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                if (customInput.trim()) {
                  onSelectUser(customInput.trim());
                  setCustomInput('');
                }
              }}
            >
              <Text style={styles.switchBtnText}>Set</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy & Right to Delete */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>🔒 Privacy & Right-to-Delete</Text>
            <Text style={styles.privacyDesc}>
              Under strict clinical privacy ethics, you can erase every stored entry and transcript for your ID at any time.
            </Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Permanently Delete My Data</Text>
            </TouchableOpacity>
            {deleteMessage ? <Text style={styles.deleteSuccess}>{deleteMessage}</Text> : null}
          </View>

          {/* Sign Out Button */}
          {onSignOut && (
            <TouchableOpacity
              style={styles.signOutModalBtn}
              onPress={() => {
                onClose();
                onSignOut();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutModalBtnText}>🚪 Sign Out & Switch Account</Text>
            </TouchableOpacity>
          )}
        </View>
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
  content: {
    padding: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 247, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
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
  currentCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D633D',
    marginBottom: 4,
  },
  currentUserId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4A2E18',
    marginBottom: 10,
  },
  reportActionBtn: {
    backgroundColor: '#5C3818',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reportActionText: {
    color: '#FFFDF7',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D633D',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  personaCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  personaCardSelected: {
    borderColor: '#B46824',
    borderWidth: 2,
    backgroundColor: '#FFF8EC',
  },
  personaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#382211',
  },
  selectedText: {
    color: '#B46824',
  },
  personaTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  personaTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  personaDesc: {
    fontSize: 12,
    color: '#7C522D',
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#382211',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
  },
  switchBtn: {
    backgroundColor: '#5C3818',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchBtnText: {
    color: '#FFFDF7',
    fontWeight: '700',
    fontSize: 13,
  },
  privacyCard: {
    backgroundColor: 'rgba(254, 243, 199, 0.6)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 10,
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteSuccess: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    textAlign: 'center',
  },
  signOutModalBtn: {
    backgroundColor: '#FAF1E6',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.18)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutModalBtnText: {
    color: '#5C3A21',
    fontWeight: '700',
    fontSize: 13,
  },
});
