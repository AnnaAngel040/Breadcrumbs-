import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { createAccount, getAccount } from '../services/api';

export default function AuthModal({
  visible,
  onClose,
  initialRole = 'patient', // 'patient' or 'therapist'
  initialMode = 'signin', // 'signin' or 'signup'
  onAuthSuccess, // (account) => void
}) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset or initialize state when opening
  React.useEffect(() => {
    if (visible) {
      setRole(initialRole);
      setMode(initialMode);
      setError('');
      setLoading(false);
    }
  }, [visible, initialRole, initialMode]);

  const handleSubmit = async () => {
    setError('');
    const cleanId = userId.trim();

    if (!cleanId) {
      setError('Please enter a User ID or Username.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please provide a display name.');
          setLoading(false);
          return;
        }

        const account = await createAccount(cleanId, displayName.trim(), role, email.trim() || null);
        setLoading(false);
        onAuthSuccess(account);
      } else {
        // Sign in
        const account = await getAccount(cleanId);
        setLoading(false);
        onAuthSuccess(account);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Please try again.');
    }
  };

  const selectQuickPersona = async (id, personaRole = 'patient') => {
    setLoading(true);
    setError('');
    try {
      const account = await getAccount(id);
      account.role = personaRole;
      setLoading(false);
      onAuthSuccess(account);
    } catch (err) {
      setLoading(false);
      setError('Could not sign in with demo user.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => {
                setMode('signin');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => {
                setMode('signup');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Role Selector Pill */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'patient' && styles.roleOptionActive]}
              onPress={() => setRole('patient')}
            >
              <Text style={[styles.roleOptionText, role === 'patient' && styles.roleOptionTextActive]}>
                🤎 Member / Seeker
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'therapist' && styles.roleOptionActive]}
              onPress={() => setRole('therapist')}
            >
              <Text style={[styles.roleOptionText, role === 'therapist' && styles.roleOptionTextActive]}>
                🩺 Clinician / Provider
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>USER ID / USERNAME *</Text>
            <TextInput
              style={styles.input}
              placeholder={role === 'patient' ? 'e.g. maya_24' : 'e.g. dr_chen'}
              placeholderTextColor="#A47B55"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
            />
          </View>

          {mode === 'signup' && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>DISPLAY NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={role === 'patient' ? 'e.g. Maya Lin' : 'e.g. Dr. Amara Chen'}
                  placeholderTextColor="#A47B55"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#A47B55"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signin'
                  ? role === 'patient'
                    ? 'Sign In & Enter Sanctuary →'
                    : 'Sign In to Provider Portal 🪪'
                  : role === 'patient'
                  ? 'Join as Member & Enter Sanctuary →'
                  : 'Register Clinical Provider Profile'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Sign-in Helper */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>OR INSTANT DEMO ACCESS</Text>
            
            {role === 'patient' ? (
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => selectQuickPersona('demo_escalating', 'patient')}
                >
                  <Text style={styles.quickBtnTitle}>Alex (Escalating)</Text>
                  <Text style={styles.quickBtnSub}>High Stress Curve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => selectQuickPersona('demo_improving', 'patient')}
                >
                  <Text style={styles.quickBtnTitle}>Jordan (Improving)</Text>
                  <Text style={styles.quickBtnSub}>Recovery Curve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickBtn, { borderColor: '#DC2626' }]}
                  onPress={() => selectQuickPersona('demo_flagged', 'patient')}
                >
                  <Text style={[styles.quickBtnTitle, { color: '#B91C1C' }]}>Sam (Flagged)</Text>
                  <Text style={styles.quickBtnSub}>Acute Crisis Alert</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={[styles.quickBtn, { flex: 1 }]}
                  onPress={() => selectQuickPersona('th_chen', 'therapist')}
                >
                  <Text style={styles.quickBtnTitle}>Dr. Amara Chen</Text>
                  <Text style={styles.quickBtnSub}>Licensed Clinical Psychologist</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.1)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFE3D5',
    alignItems: 'center',
    justifyContent: 'center',
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFE3D5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFFDF9',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#825C3C',
  },
  tabTextActive: {
    color: '#4A2E18',
    fontWeight: '700',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 46, 24, 0.12)',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
  },
  roleOptionActive: {
    borderColor: '#6D4330',
    backgroundColor: '#F5EBE1',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A5435',
  },
  roleOptionTextActive: {
    color: '#6D4330',
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A5435',
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#382211',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.14)',
  },
  submitBtn: {
    backgroundColor: '#6D4330',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
    shadowColor: '#6D4330',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.1)',
    paddingTop: 16,
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8D633D',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.12)',
    alignItems: 'center',
  },
  quickBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 2,
  },
  quickBtnSub: {
    fontSize: 10,
    color: '#8D633D',
  },
});
