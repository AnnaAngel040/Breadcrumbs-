import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import AuthModal from './AuthModal';

export default function WelcomePage({ onEnterAsPatient, onEnterAsTherapist, onNavigateToFindCare }) {
  const [authVisible, setAuthVisible] = useState(false);

  const [authRole, setAuthRole] = useState('patient');
  const [authMode, setAuthMode] = useState('signin');

  const openAuth = (role, mode = 'signin') => {
    setAuthRole(role);
    setAuthMode(mode);
    setAuthVisible(true);
  };

  const handleAuthSuccess = (account) => {
    setAuthVisible(false);
    if (account.role === 'therapist') {
      onEnterAsTherapist(account);
    } else {
      onEnterAsPatient(account);
    }
  };

  const MemberFeature = ({ text }) => (
    <View style={styles.featureRow}>
      <View style={styles.featureBullet} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  const ProviderFeature = ({ text }) => (
    <View style={styles.featureRow}>
      <View style={[styles.featureBullet, { backgroundColor: '#9D7E6A' }]} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top Nav Bar */}
        <View style={styles.navbar}>
          <View style={styles.navBrand}>
            <Image
              source={{ uri: '/image-removebg.svg' }}
              style={styles.navLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.navBrandName}>Breadcrumbs</Text>
              <Text style={styles.navBrandTag}>gentle daily decompression</Text>
            </View>
          </View>

          <View style={styles.navLinks}>
            <TouchableOpacity onPress={() => openAuth('patient', 'signin')}>
              <Text style={styles.navLink}>Check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openAuth('patient', 'signin')}>
              <Text style={styles.navLink}>Stress Insights</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onNavigateToFindCare || (() => openAuth('patient', 'signin'))}>
              <Text style={styles.navLink}>Find Care</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInBtn} onPress={() => openAuth('patient', 'signin')}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>✦ A SANCTUARY FOR MIND & PRACTICE</Text>
          </View>
          <Text style={styles.heroTitle}>Welcome to Breadcrumbs</Text>
          <Text style={styles.heroSubtitle}>
            Choose your space to continue your mindful journey.
          </Text>
        </View>

        {/* Two-Card Selection Area */}
        <View style={styles.cardRow}>

          {/* Individual / Member Card */}
          <View style={[styles.card, styles.memberCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F5E6DC' }]}>
                <Text style={styles.cardIcon}>🤎</Text>
              </View>
              <Text style={styles.cardAudience}>For Seekers & Individuals</Text>
            </View>

            <Text style={styles.cardTitle}>Individual / Member</Text>
            <Text style={styles.cardDesc}>
              I want to track stress, reflect on emotional crumbs, and connect with
              thoughtful clinical guidance.
            </Text>

            <Text style={styles.featureListTitle}>YOUR MEMBER SANCTUARY INCLUDES</Text>
            <MemberFeature text="Private, low-pressure daily check-ins & reflections" />
            <MemberFeature text="Personal stress waveforms & somatic rhythm patterns" />
            <MemberFeature text="Personalised, values-aligned therapist matching" />
            <MemberFeature text="24/7 gentle grounding support & mindful breathaids" />

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => openAuth('patient', 'signin')}
              >
                <Text style={styles.primaryBtnText}>Continue as Member →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => openAuth('patient', 'signup')}
              >
                <Text style={styles.secondaryBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Therapist / Counselor Card */}
          <View style={[styles.card, styles.therapistCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#E8DAD3' }]}>
                <Text style={styles.cardIcon}>🩺</Text>
              </View>
              <Text style={styles.cardAudience}>For Clinicians & Healers</Text>
            </View>

            <Text style={styles.cardTitle}>Therapist / Counselor</Text>
            <Text style={styles.cardDesc}>
              I am a licensed professional supporting clients and cultivating
              restorative clinical care.
            </Text>

            <Text style={styles.featureListTitle}>PROVIDER WORKSPACE TOOLS</Text>
            <ProviderFeature text="Client referral overview & verified caseload matching" />
            <ProviderFeature text="HIPAA-compliant HD telehealth & async messaging" />
            <ProviderFeature text="Patient stress timeline insights & trigger synthesis" />
            <ProviderFeature text="Integrated practice calendar, super-bills & insurance billing" />

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.providerPrimaryBtn]}
                onPress={() => openAuth('therapist', 'signin')}
              >
                <Text style={styles.primaryBtnText}>Continue as Provider 🪪</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => openAuth('therapist', 'signup')}
              >
                <Text style={styles.secondaryBtnText}>Apply to Join Network</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Disclaimer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>✦ HIPAA Compliant</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerText}>256 Bit Encrypted</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerText}>100% Privacy & Confidential</Text>
        </View>
      </ScrollView>

      {/* Auth Modal */}
      <AuthModal
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        initialRole={authRole}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D8D0',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#E8D8D0',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogo: {
    width: 32,
    height: 26,
  },
  navBrandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  navBrandTag: {
    fontSize: 9,
    color: '#7C522D',
    fontStyle: 'italic',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  navLink: {
    fontSize: 13,
    color: '#5C3818',
    fontWeight: '500',
  },
  signInBtn: {
    backgroundColor: 'rgba(255, 253, 249, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  signInBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A2E18',
  },

  // Hero
  heroBanner: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C522D',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B4423',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Cards
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    minWidth: 280,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  memberCard: {
    backgroundColor: '#FFF1E8',
  },
  therapistCard: {
    backgroundColor: '#FFF1E8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  cardAudience: {
    fontSize: 11,
    color: '#7C522D',
    fontWeight: '600',
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3A1F09',
    fontFamily: 'Fraunces',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B4423',
    lineHeight: 20,
    marginBottom: 18,
  },
  featureListTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8D633D',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  featureBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6D4330',
    marginTop: 5,
    marginRight: 9,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 12,
    color: '#6B4423',
    flex: 1,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#6D4330',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#6D4330',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  providerPrimaryBtn: {
    backgroundColor: '#5C3818',
  },
  primaryBtnText: {
    color: '#FFFDF9',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A2E18',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    gap: 8,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 11,
    color: '#7C522D',
    fontWeight: '600',
  },
  footerDot: {
    fontSize: 11,
    color: '#7C522D',
  },
});
