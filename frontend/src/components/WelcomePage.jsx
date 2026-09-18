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
            <View style={styles.cardTopContent}>
              <View style={styles.cardIconBox}>
                <Text style={styles.cardIcon}>♡</Text>
              </View>

              <Text style={styles.cardTitle}>Individual / Member</Text>
              <Text style={styles.cardSubtitle}>For Seekers & Individuals</Text>
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
            <View style={styles.cardTopContent}>
              <View style={styles.cardIconBox}>
                <Text style={styles.cardIcon}>⚕</Text>
              </View>

              <Text style={styles.cardTitle}>Therapist / Counselor</Text>
              <Text style={styles.cardSubtitle}>For Clinicians & Healers</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => openAuth('therapist', 'signin')}
              >
                <Text style={styles.primaryBtnText}>Continue as Provider →</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F7ECCD',
    width: '100%',
    minHeight: '100vh',
  },
  scroll: {
    flexGrow: 1,
    minHeight: '100vh',
    backgroundColor: '#F7ECCD',
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
    backgroundColor: '#F7ECCD',
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
    borderColor: 'rgba(74, 46, 24, 0.25)',
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
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.15)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C522D',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B4423',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    maxWidth: 600,
  },

  // Arched Cards
  cardRow: {
    flexDirection: 'row',
    gap: 28,
    paddingHorizontal: 24,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 40,
  },
  card: {
    flex: 1,
    minWidth: 320,
    maxWidth: 380,
    minHeight: 460,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  memberCard: {
    backgroundColor: '#FFFDF7',
  },
  therapistCard: {
    backgroundColor: '#FFFDF7',
  },
  cardTopContent: {
    alignItems: 'center',
    width: '100%',
  },
  cardIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFE1CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  cardIcon: {
    fontSize: 22,
    color: '#4A2E18',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A1F09',
    fontFamily: 'Fraunces',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#8D633D',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 28,
  },
  cardActions: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    maxWidth: 270,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#4A2E18',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    cursor: 'pointer',
  },
  primaryBtnText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#4A2E18',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
  },
});