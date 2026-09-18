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

        <ScrollView style={{ flex: 1, backgroundColor: '#F6EAC9' }} contentContainerStyle={styles.content}>
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
                🤎 I am seeking support
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'therapist' && styles.roleOptionActive]}
              onPress={() => setRole('therapist')}
            >
              <Text style={[styles.roleOptionText, role === 'therapist' && styles.roleOptionTextActive]}>
                🩺 I am a licensed therapist
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
                    : 'Sign In to Provider Portal →'
                  : role === 'patient'
                  ? 'Join as Member & Enter Sanctuary →'
                  : 'Register Clinical Provider Profile →'}
              </Text>
            )}
          </TouchableOpacity>
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
    paddingVertical: 12,
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
    paddingBottom: 40,
    minHeight: '100%',
    flexGrow: 1,
    backgroundColor: '#F6EAC9',
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAD7B5',
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
    backgroundColor: '#FFFDF7',
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
    backgroundColor: '#FFFDF7',
  },
  roleOptionActive: {
    borderColor: '#6D4330',
    backgroundColor: '#EFE0C2',
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
    backgroundColor: '#FFFDF7',
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
    cursor: 'pointer',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
  },
});
