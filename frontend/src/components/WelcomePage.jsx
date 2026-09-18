import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import AuthModal from './AuthModal';

export default function WelcomePage({
  onEnterAsPatient,
  onEnterAsTherapist,
  onNavigateToFindCare,
  onOpenInsights,
}) {
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

            <TouchableOpacity
              onPress={() => {
                if (onNavigateToFindCare) {
                  onNavigateToFindCare();
                } else if (onOpenInsights) {
                  onOpenInsights();
                } else {
                  openAuth('patient', 'signin');
                }
              }}
            >
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
            <View>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#F5E6DC' }]}>
                  <Text style={styles.cardIcon}>🤎</Text>
                </View>
                <Text style={styles.cardAudience}>For Seekers & Individuals</Text>
              </View>

              <Text style={styles.cardTitle}>Individual / Member</Text>
              <Text style={styles.cardDesc}>
                I want to track stress, reflect on emotional crumbs, and connect with
                thoughtful clinical guidance in a private, gentle space.
              </Text>
            </View>

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
            <View>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#E8DAD3' }]}>
                  <Text style={styles.cardIcon}>🩺</Text>
                </View>
                <Text style={styles.cardAudience}>For Clinicians & Healers</Text>
              </View>

              <Text style={styles.cardTitle}>Therapist / Counselor</Text>
              <Text style={styles.cardDesc}>
                I am a licensed professional managing client caseloads, tracking longitudinal recovery curves, and cultivating restorative clinical care.
              </Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.providerPrimaryBtn]}
                onPress={() => openAuth('therapist', 'signin')}
              >
                <Text style={styles.primaryBtnText}>Continue as Provider →</Text>
              </TouchableOpacity>
              <View style={styles.actionSpacer} />
            </View>
          </View>
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
    width: '100%',
    minHeight: '100vh',
  },
  scroll: {
    flexGrow: 1,
    minHeight: '100vh',
    backgroundColor: '#E8D8D0',
    paddingBottom: 40,
    justifyContent: 'space-between',
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#E8D8D0',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLogo: {
    width: 38,
    height: 32,
  },
  navBrandName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
  },
  navBrandTag: {
    fontSize: 11,
    color: '#7C522D',
    fontStyle: 'italic',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navLink: {
    fontSize: 15,
    color: '#5C3818',
    fontWeight: '600',
    cursor: 'pointer',
  },
  signInBtn: {
    backgroundColor: 'rgba(255, 253, 249, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 46, 24, 0.2)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
    cursor: 'pointer',
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
  },

  // Hero
  heroBanner: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C522D',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#6B4423',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    maxWidth: 600,
  },

  // Cards
  cardRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  card: {
    flex: 1,
    minWidth: 300,
    borderRadius: 24,
    padding: 28,
    justifyContent: 'space-between',
    backgroundColor: '#FFF1E8',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
    marginBottom: 16,
  },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardAudience: {
    fontSize: 13,
    color: '#7C522D',
    fontWeight: '700',
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3A1F09',
    fontFamily: 'Fraunces',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 15,
    color: '#6B4423',
    lineHeight: 24,
    marginBottom: 20,
  },
  cardActions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#6D4330',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D4330',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    cursor: 'pointer',
  },
  providerPrimaryBtn: {
    backgroundColor: '#5C3818',
  },
  primaryBtnText: {
    color: '#FFFDF9',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(109, 67, 48, 0.25)',
    backgroundColor: 'rgba(255, 253, 249, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5C3818',
  },
  actionSpacer: {
    width: '100%',
    height: 44,
  },
});