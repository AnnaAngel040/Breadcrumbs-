import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';

import Mascot from './components/Mascot';
import CalendarModal from './components/CalendarModal';
import ReportModal from './components/ReportModal';
import ProfileModal from './components/ProfileModal';
import WelcomePage from './components/WelcomePage';
import TherapistPortalModal from './components/TherapistPortalModal';
import {
  checkBackendStatus,
  submitTextEntry,
  submitAudioEntry,
} from './services/api';

// ─── Hero Screen (patient check-in view) ──────────────────────────────────────
function HeroScreen({ account, onBack }) {
  const userId = account?.user_id ?? 'demo_escalating';
  const [backendOnline, setBackendOnline] = useState(false);

  // Modals
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  // Recording & Input States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Audio Recording Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Animation values
  const micScaleAnim = useRef(new Animated.Value(1)).current;
  const resultFadeAnim = useRef(new Animated.Value(0)).current;

  // Backend health check
  useEffect(() => {
    checkBackendStatus().then((online) => setBackendOnline(online));
    const interval = setInterval(() => {
      checkBackendStatus().then((online) => setBackendOnline(online));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Timer for audio recording + mic pulse animation
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(micScaleAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(micScaleAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      micScaleAnim.setValue(1);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsSubmitting(true);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        setTimeout(async () => {
          const res = await submitAudioEntry(userId, new Blob());
          handleEntrySuccess(res);
        }, 1200);
      }
    } else {
      setLastResult(null);
      resultFadeAnim.setValue(0);
      if (navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach((track) => track.stop());
            const res = await submitAudioEntry(userId, audioBlob);
            handleEntrySuccess(res);
          };
          recorder.start();
          setIsRecording(true);
        } catch (err) {
          console.warn('Microphone access not available, running demo mode:', err.message);
          setIsRecording(true);
        }
      } else {
        setIsRecording(true);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setLastResult(null);
    resultFadeAnim.setValue(0);
    const res = await submitTextEntry(userId, textInput.trim());
    setTextInput('');
    setShowTextInput(false);
    handleEntrySuccess(res);
  };

  const handleEntrySuccess = (entry) => {
    setIsSubmitting(false);
    setLastResult(entry);
    Animated.timing(resultFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {/* Profile Button (Top-Left) */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setProfileVisible(true)}
          accessibilityLabel="Profile and Settings"
        >
          <Image
            source={{ uri: '/user-icon.png' }}
            style={styles.headerIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Centered Brand */}
        <View style={styles.titleWrapper} pointerEvents="none">
          <Text style={styles.headerTitle}>Breadcrumbs</Text>
        </View>

        {/* Calendar Button (Top-Right) */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setCalendarVisible(true)}
          accessibilityLabel="Calendar Timeline"
        >
          <Image
            source={{ uri: '/calendar-icon.png' }}
            style={styles.headerIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Main Check-in Stage */}
      <View style={styles.mainStage}>
        <View style={styles.circleStage}>
          <Mascot state={isRecording ? 'listening' : isSubmitting ? 'thinking' : 'idle'} size={95} />
        </View>

        <Text style={styles.promptText}>"How was your day?"</Text>

        {isRecording && (
          <View style={styles.recordingPill}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening... {formatSeconds(recordingSeconds)}</Text>
          </View>
        )}

        {isSubmitting && (
          <View style={styles.submittingBox}>
            <ActivityIndicator size="small" color="#5C3818" />
            <Text style={styles.submittingText}>Analyzing emotional reflection...</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: micScaleAnim }] }}>
          <TouchableOpacity
            style={[styles.micPillWrapper, isRecording && styles.micPillActive]}
            onPress={toggleRecording}
            activeOpacity={0.85}
            accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Voice Check-in'}
          >
            <Image
              source={{ uri: '/mic-pill.png' }}
              style={styles.micPillImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.typeToggleBtn}
          onPress={() => setShowTextInput(!showTextInput)}
        >
          <Text style={styles.typeToggleText}>
            {showTextInput ? '▲ Close text input' : '✍️ Or write a reflection'}
          </Text>
        </TouchableOpacity>

        {showTextInput && (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInputField}
              placeholder="Tell Breadcrumbs what was on your mind today..."
              placeholderTextColor="#8D633D"
              multiline
              value={textInput}
              onChangeText={setTextInput}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !textInput.trim() && styles.sendBtnDisabled]}
              onPress={handleTextSubmit}
              disabled={!textInput.trim() || isSubmitting}
            >
              <Text style={styles.sendBtnText}>Save Breadcrumb</Text>
            </TouchableOpacity>
          </View>
        )}

        {lastResult && (
          <Animated.View style={[styles.resultCard, { opacity: resultFadeAnim }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCheck}>✓ Check-in Logged</Text>
              <Text style={styles.resultCategory}>📂 {lastResult.category}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Detected Stress Level:</Text>
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color:
                      lastResult.stress_score > 0.7
                        ? '#DC2626'
                        : lastResult.stress_score > 0.4
                        ? '#D97706'
                        : '#16A34A',
                  },
                ]}
              >
                {Math.round((lastResult.stress_score || 0) * 100)}%
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewReportBtn}
              onPress={() => setReportVisible(true)}
            >
              <Text style={styles.viewReportBtnText}>View Clinical Insights & Trends →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Modals */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        userId={userId}
      />
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        userId={userId}
      />
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        userId={userId}
        onSelectUser={() => {}}
        onOpenReport={() => {
          setProfileVisible(false);
          setReportVisible(true);
        }}
        backendOnline={backendOnline}
      />

      {/* Back to Welcome */}
      <TouchableOpacity style={styles.signOutBtn} onPress={onBack}>
        <Text style={styles.signOutText}>← Back to Welcome</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Root Router ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [activeAccount, setActiveAccount] = useState(null);

  const handleEnterAsPatient = (account) => {
    setActiveAccount(account);
    setScreen('hero');
  };

  const handleEnterAsTherapist = (account) => {
    setActiveAccount(account);
    setScreen('therapist');
  };

  const handleSelectPatient = (patient) => {
    setActiveAccount(patient);
    setScreen('hero');
  };

  if (screen === 'welcome') {
    return (
      <WelcomePage
        onEnterAsPatient={handleEnterAsPatient}
        onEnterAsTherapist={handleEnterAsTherapist}
      />
    );
  }

  if (screen === 'therapist') {
    return (
      <TherapistPortalModal
        visible={true}
        onClose={() => setScreen('welcome')}
        therapistId={activeAccount?.user_id || 'demo_therapist'}
        therapistAccount={activeAccount}
        onSelectPatient={handleSelectPatient}
      />
    );
  }

  return (
    <HeroScreen
      account={activeAccount}
      onBack={() => setScreen('welcome')}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EAC9',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 14,
    position: 'relative',
    zIndex: 20,
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 242, 217, 0.65)',
    zIndex: 30,
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  mainStage: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  circleStage: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FBF2D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A4215',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    marginBottom: 28,
  },
  promptText: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.2,
  },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  submittingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  submittingText: {
    fontSize: 13,
    color: '#6B4423',
    fontStyle: 'italic',
  },
  micPillWrapper: {
    width: 172,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  micPillActive: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micPillImage: {
    width: 172,
    height: 48,
  },
  typeToggleBtn: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  typeToggleText: {
    fontSize: 13,
    color: '#7C522D',
    fontWeight: '600',
  },
  textInputContainer: {
    width: '100%',
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.12)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  textInputField: {
    fontSize: 14,
    color: '#382211',
    minHeight: 64,
    textAlignVertical: 'top',
    padding: 6,
  },
  sendBtn: {
    backgroundColor: '#5C3818',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFFDF7',
    fontWeight: '700',
    fontSize: 13,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#FFFDF7',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultCheck: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  resultCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4423',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#7C522D',
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  viewReportBtn: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.08)',
    alignItems: 'center',
  },
  viewReportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C3818',
  },
  signOutBtn: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 46, 24, 0.08)',
  },
  signOutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C522D',
  },
});
