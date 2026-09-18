import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  useWindowDimensions,
} from 'react-native';
import {
  fetchTherapists,
  fetchUserOverview,
  linkTherapistPatient,
} from '../services/api';
import CalendarModal from './CalendarModal';
import ProfileModal from './ProfileModal';

const CATEGORY_MAP = {
  'Work/Career': {
    title: 'Workload Pressure & Burnout Recovery',
    subtitle: 'Prioritizing practitioners certified in Somatic Grounding, CBT boundary restructuring, and corporate fatigue restoration.',
    specialtyLabel: 'Workplace Burnout & CBT',
  },
  'Academics': {
    title: 'Academic Stress & Competitive Exam Anxiety',
    subtitle: 'Prioritizing specialists in cognitive restructuring, thesis resilience, and exam performance de-escalation.',
    specialtyLabel: 'Academic & Exam Stress',
  },
  'Relationship': {
    title: 'Interpersonal Dynamics & Attachment Safety',
    subtitle: 'Prioritizing clinicians specialized in EFT communication, attachment pacing, and relational de-escalation.',
    specialtyLabel: 'Relational & Attachment EFT',
  },
  'Family': {
    title: 'Family Systems & Generational Boundaries',
    subtitle: 'Prioritizing licensed family therapists skilled in boundary navigation and emotional individuation.',
    specialtyLabel: 'Family Systems & Boundaries',
  },
  'Friends/Social': {
    title: 'Social Battery & Connection Restoration',
    subtitle: 'Prioritizing clinicians in social anxiety de-sensitization and authentic community rebuilding.',
    specialtyLabel: 'Social Anxiety & Connection',
  },
  'Health': {
    title: 'Somatic Grounding & Nervous System Pacing',
    subtitle: 'Prioritizing practitioners certified in vagal pacing, chronic tension relief, and somatic mindfulness.',
    specialtyLabel: 'Somatic Regulation & Mind-Body',
  },
  'Finances': {
    title: 'Economic Uncertainty & Livelihood Grounding',
    subtitle: 'Prioritizing clinicians trained in financial anxiety reframing and crisis stress mitigation.',
    specialtyLabel: 'Financial Stress & Cognitive CBT',
  },
  'Self-esteem/Identity': {
    title: 'Self-Compassion & Inner Critic Softening',
    subtitle: 'Prioritizing therapists specialized in Compassion-Focused Therapy (CFT) and identity validation.',
    specialtyLabel: 'Self-Compassion & CFT',
  },
};

function getInitials(name) {
  if (!name) return 'DR';
  const clean = name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

function openExternalLink(url) {
  try {
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  } catch (e) {
    console.warn('Could not open URL:', e);
  }
}

export default function FindCarePage({
  account,
  onNavigateToCheckIn,
  onOpenAuth,
  onSignOut,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const userId = account?.user_id ?? 'demo_escalating';
  const displayName = account?.display_name ?? 'Alex';

  // Core data states
  const [therapists, setTherapists] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateFeedback, setUpdateFeedback] = useState(false);

  // Modal states
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  // Care Preference states
  const [selectedFormat, setSelectedFormat] = useState('video'); // 'video' | 'voice' | 'text'
  const [selectedGender, setSelectedGender] = useState('any'); // 'any' | 'female' | 'male' | 'non-binary'
  const [slidingScaleOnly, setSlidingScaleOnly] = useState(true);

  // Active filter chips
  const [activeFilters, setActiveFilters] = useState({
    specialty: null,
    format: 'Video & Audio Chat',
    insurance: 'Star Health, HDFC ERGO, Self-pay / Sliding Scale',
  });

  // Saved / Bookmarked therapists (persisted to localStorage)
  const [savedIds, setSavedIds] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('breadcrumbs_saved_therapists');
        if (saved) return new Set(JSON.parse(saved));
      }
    } catch {}
    return new Set();
  });
  const [linkedTherapists, setLinkedTherapists] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('breadcrumbs_therapist_patient_links');
        if (raw) {
          const links = JSON.parse(raw);
          return new Set(
            Object.keys(links).filter((therapistId) => (links[therapistId] || []).includes(userId))
          );
        }
      }
    } catch {}
    return new Set();
  });
  const [linkFeedback, setLinkFeedback] = useState('');

  // Modals
  const [selectedTherapistForProfile, setSelectedTherapistForProfile] = useState(null);
  const [selectedTherapistForCall, setSelectedTherapistForCall] = useState(null);
  const [crisisModalVisible, setCrisisModalVisible] = useState(false);

  // Load data on mount or userId change
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async (overrides = {}) => {
    setLoading(true);
    try {
      const ov = await fetchUserOverview(userId);
      setOverview(ov);

      const category = ov?.primary_area || 'Work/Career';
      const categoryConfig = CATEGORY_MAP[category] || CATEGORY_MAP['Work/Career'];

      const fmt = overrides.format !== undefined ? overrides.format : selectedFormat;
      const gen = overrides.gender !== undefined ? overrides.gender : selectedGender;
      const sld = overrides.slidingScale !== undefined ? overrides.slidingScale : slidingScaleOnly;

      const modeParam = fmt === 'video' ? 'online' : (fmt === 'voice' ? 'any' : 'online');
      const thList = await fetchTherapists(userId, category, {
        preferred_mode: modeParam,
        gender: gen,
        sliding_scale: sld,
      });

      setTherapists(thList || []);

      setActiveFilters((prev) => ({
        ...prev,
        specialty: categoryConfig.specialtyLabel,
        format: prev.format ? (fmt === 'video' ? 'Video & Audio Chat' : (fmt === 'voice' ? 'Voice Consultation' : 'Text Messaging')) : null,
      }));
    } catch (e) {
      console.warn('Error loading find care data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = () => {
    setUpdateFeedback(true);
    loadData();
    setTimeout(() => setUpdateFeedback(false), 2000);
  };

  const handleLinkTherapist = async (therapist) => {
    try {
      await linkTherapistPatient(therapist.id, userId);
      setLinkedTherapists((prev) => new Set(prev).add(therapist.id));
      setLinkFeedback(`Linked to ${therapist.name}. The therapist can now view your stress report.`);
      setTimeout(() => setLinkFeedback(''), 3500);
    } catch (e) {
      console.warn('Could not link therapist:', e);
      setLinkFeedback('Could not link this therapist right now. Please try again.');
      setTimeout(() => setLinkFeedback(''), 3500);
    }
  };

  const toggleBookmark = (id) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('breadcrumbs_saved_therapists', JSON.stringify(Array.from(next)));
        }
      } catch {}
      return next;
    });
  };

  const handleCallTherapist = (therapist) => {
    setSelectedTherapistForCall(therapist);
  };

  const dialPhoneNumber = (phone) => {
    const cleanPhone = (phone || '14416').replace(/[^0-9]/g, '');
    try {
      if (typeof window !== 'undefined') {
        window.location.href = `tel:${cleanPhone}`;
      } else {
        Linking.openURL(`tel:${cleanPhone}`);
      }
    } catch (e) {
      console.log('Calling:', e);
    }
  };

  const handleCallCrisis = () => {
    setCrisisModalVisible(true);
  };

  const removeFilter = (key) => {
    setActiveFilters((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    if (key === 'format') {
      setSelectedFormat('video');
      loadData({ format: 'any' });
    } else if (key === 'specialty') {
      loadData();
    }
  };

  const resetFilters = () => {
    setSelectedFormat('video');
    setSelectedGender('any');
    setSlidingScaleOnly(true);
    setActiveFilters({
      specialty: 'Workplace Burnout & CBT',
      format: 'Video & Audio Chat',
      insurance: 'Star Health, HDFC ERGO, Self-pay / Sliding Scale',
    });
    loadData({ format: 'video', gender: 'any', slidingScale: true });
  };

  const primaryCategory = overview?.primary_area || 'Work/Career';
  const categoryHeader = CATEGORY_MAP[primaryCategory] || CATEGORY_MAP['Work/Career'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >

        {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
        <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
          <TouchableOpacity style={styles.navBrand} onPress={onNavigateToCheckIn} activeOpacity={0.8}>
            <Image
              source={{ uri: '/image-removebg.svg' }}
              style={styles.navLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.navBrandName}>Breadcrumbs</Text>
              <Text style={styles.navBrandTag}>gentle daily decompression</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.navLinks}>
            <TouchableOpacity style={styles.navBtn} onPress={onNavigateToCheckIn}>
              <Text style={styles.navBtnText}>Check-in</Text>
            </TouchableOpacity>

            <View style={styles.navBtnActive}>
              <Text style={styles.navBtnActiveText}>Find Care</Text>
            </View>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                if (account) {
                  setProfileVisible(true);
                } else {
                  onOpenAuth();
                }
              }}
            >
              <Text style={styles.navBtnText}>{account ? displayName : 'Sign In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateBadge}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.75}
              accessibilityLabel="Open Calendar Timeline"
            >
              <Text style={styles.dateBadgeIcon}>📅</Text>
              <Text style={styles.dateBadgeText}>Timeline</Text>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Main Content Canvas (Responsive Flexbox) ──────────────────── */}
        <View style={[styles.mainCanvas, isMobile && styles.mainCanvasMobile]}>

          {/* ═════════ LEFT COLUMN (Hero Banner + Therapist Cards) ══════════ */}
          <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>

            {/* Hero Matched Banner */}
            <View style={styles.heroCard}>
              <View style={[styles.heroTopRow, isMobile && { flexDirection: 'column' }]}>
                <View style={styles.heroLeftHeader}>
                  <View style={styles.algorithmBadge}>
                    <Text style={styles.algorithmBadgeIcon}>✦</Text>
                    <Text style={styles.algorithmBadgeText}>COMPASSIONATE PAIRING ALGORITHM</Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Matched to Your Stress Profile:{' '}
                    <Text style={styles.heroTitleItalic}>{categoryHeader.title}</Text>
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {categoryHeader.subtitle}
                  </Text>
                </View>

                {/* Verified Practices Count */}
                <View style={styles.providerCountBadge}>
                  <Text style={styles.providerCountNumber}>{therapists.length}</Text>
                  <Text style={styles.providerCountLabel}>Practices Listed</Text>
                </View>
              </View>

              {/* Filter Chips Bar */}
              <View style={styles.filterChipsRow}>
                <Text style={styles.refinedByLabel}>REFINED BY:</Text>

                {activeFilters.specialty && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Specialty: {activeFilters.specialty}</Text>
                    <TouchableOpacity onPress={() => removeFilter('specialty')}>
                      <Text style={styles.filterChipClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeFilters.format && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Format: {activeFilters.format}</Text>
                    <TouchableOpacity onPress={() => removeFilter('format')}>
                      <Text style={styles.filterChipClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeFilters.insurance && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Coverage: {activeFilters.insurance}</Text>
                    <TouchableOpacity onPress={() => removeFilter('insurance')}>
                      <Text style={styles.filterChipClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.resetFiltersBtn} onPress={resetFilters}>
                  <Text style={styles.resetFiltersText}>⟲ Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#5C3A21" />
                <Text style={styles.loadingText}>Finding practitioners matching your comfort thresholds...</Text>
              </View>
            )}

            {/* Empty State */}
            {!loading && therapists.length === 0 && (
              <View style={styles.emptyResultsBox}>
                <Text style={styles.emptyResultsTitle}>No exact practitioner match with these specific filters.</Text>
                <Text style={styles.emptyResultsSubtitle}>Try expanding your gender preference or resetting filters above.</Text>
                <TouchableOpacity style={styles.resetLargeBtn} onPress={resetFilters}>
                  <Text style={styles.resetLargeBtnText}>Show All Available Practitioners</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* List of Therapist Cards */}
            {!loading && therapists.map((therapist) => {
              const isSaved = savedIds.has(therapist.id);
              const initials = getInitials(therapist.name);
              const phoneDisplay = therapist.phone || '+91 80 5550 1422';

              return (
                <View key={therapist.id} style={[styles.therapistCard, isMobile && styles.therapistCardMobile]}>
                  {/* Clean Avatar Icon Badge */}
                  <View style={styles.avatarIconBadgeContainer}>
                    <View style={styles.avatarBadgeCircle}>
                      <Text style={styles.avatarBadgeInitials}>{initials}</Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedCheck}>✓</Text>
                    </View>
                  </View>

                  {/* Body info */}
                  <View style={styles.cardInfo}>
                    {/* Top title & match score */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.nameContainer}>
                        <Text style={styles.therapistName}>{therapist.name}</Text>
                        <Text style={styles.therapistTitle}>
                          {therapist.title || `${therapist.specialty} Specialist`}
                        </Text>
                      </View>

                      {/* Specialty Domain Tag (No simulated score) */}
                      <View style={styles.specialtyBadge}>
                        <Text style={styles.specialtyBadgeText}>
                          🌿 {therapist.specialty || 'General Care'}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata Row: Rating, Reviews, Cost, Location */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaItem}>
                        ★ <Text style={styles.metaBold}>{therapist.rating || 4.9}</Text>{' '}
                        <Text style={styles.metaMuted}>({therapist.review_count || '89 reviews'})</Text>
                      </Text>
                      <Text style={styles.metaDivider}>•</Text>
                      <Text style={styles.metaItem}>
                        💳 <Text style={styles.metaBold}>{therapist.price || '₹1,200 / session'}</Text>
                      </Text>
                      <Text style={styles.metaDivider}>•</Text>
                      <Text style={styles.metaItem}>
                        📍 <Text style={styles.metaBold}>{therapist.city || 'Bengaluru'}</Text>
                      </Text>
                    </View>

                    {/* Direct Contact & Review Actions (NO INTERNAL BOOKING) */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.callPracticeBtn}
                        onPress={() => handleCallTherapist(therapist)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.callPracticeBtnText}>📞 Contact Practice</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={linkedTherapists.has(therapist.id) ? styles.linkedBtn : styles.linkTherapistBtn}
                        onPress={() => handleLinkTherapist(therapist)}
                        disabled={linkedTherapists.has(therapist.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={linkedTherapists.has(therapist.id) ? styles.linkedBtnText : styles.linkTherapistBtnText}>
                          {linkedTherapists.has(therapist.id) ? 'Linked ✓' : 'Link to Therapist'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewProfileBtn}
                        onPress={() => setSelectedTherapistForProfile(therapist)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewProfileBtnText}>View Info &amp; Reviews →</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.bookmarkBtn, isSaved && styles.bookmarkBtnSaved]}
                        onPress={() => toggleBookmark(therapist.id)}
                        accessibilityLabel="Bookmark Practitioner"
                      >
                        <Text style={styles.bookmarkIcon}>{isSaved ? '🏷️' : '🔖'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Academic Prototype Disclaimer Callout */}
            <View style={styles.calloutCard}>
              <View style={styles.calloutIconCircle}>
                <Text style={styles.calloutIcon}>🛡️</Text>
              </View>
              <View style={styles.calloutTextBox}>
                <Text style={styles.calloutTitle}>Sample Provider Directory • Demo Mode</Text>
                <Text style={styles.calloutSubtitle}>
                  Breadcrumbs is an academic student project demonstrating AI-assisted stressor triage and multi-criteria practitioner matching. Provider profiles shown are simulated database samples.
                </Text>
              </View>
            </View>

          </View>

          {/* ═════════ RIGHT COLUMN (Care Preferences & India Crisis Card) ══ */}
          <View style={[styles.rightColumn, isMobile && styles.rightColumnMobile]}>

            {/* Your Care Preferences */}
            <View style={styles.sidebarCard}>
              <Text style={styles.sidebarCardTitle}>Your Care Preferences</Text>
              <Text style={styles.sidebarCardSubtitle}>
                Adjust your comfort boundary parameters anytime.
              </Text>

              {/* Preferred Format Buttons */}
              <Text style={styles.prefSectionLabel}>PREFERRED FORMAT</Text>
              <View style={styles.formatButtonsRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, selectedFormat === 'video' && styles.formatBtnActive]}
                  onPress={() => {
                    setSelectedFormat('video');
                    loadData({ format: 'video' });
                  }}
                >
                  <Text style={styles.formatBtnIcon}>📹</Text>
                  <Text style={[styles.formatBtnText, selectedFormat === 'video' && styles.formatBtnTextActive]}>
                    Video
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, selectedFormat === 'voice' && styles.formatBtnActive]}
                  onPress={() => {
                    setSelectedFormat('voice');
                    loadData({ format: 'voice' });
                  }}
                >
                  <Text style={styles.formatBtnIcon}>📞</Text>
                  <Text style={[styles.formatBtnText, selectedFormat === 'voice' && styles.formatBtnTextActive]}>
                    Voice Only
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, selectedFormat === 'text' && styles.formatBtnActive]}
                  onPress={() => {
                    setSelectedFormat('text');
                    loadData({ format: 'text' });
                  }}
                >
                  <Text style={styles.formatBtnIcon}>💬</Text>
                  <Text style={[styles.formatBtnText, selectedFormat === 'text' && styles.formatBtnTextActive]}>
                    Text Chat
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Therapist Gender Pills */}
              <Text style={styles.prefSectionLabel}>THERAPIST GENDER</Text>
              <View style={styles.genderPillsRow}>
                {['any', 'female', 'male', 'non-binary'].map((g) => {
                  const active = selectedGender === g;
                  const label = g === 'any' ? 'Any' : (g === 'female' ? 'Female' : (g === 'male' ? 'Male' : 'Non-binary'));
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderPill, active && styles.genderPillActive]}
                      onPress={() => {
                        setSelectedGender(g);
                        loadData({ gender: g });
                      }}
                    >
                      <Text style={[styles.genderPillText, active && styles.genderPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sliding Scale Toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleTitle}>Sliding Scale Priority</Text>
                  <Text style={styles.toggleSubtitle}>Prioritize income-flexible openings</Text>
                </View>
                <TouchableOpacity
                  style={[styles.switchTrack, slidingScaleOnly && styles.switchTrackActive]}
                  onPress={() => {
                    const nextVal = !slidingScaleOnly;
                    setSlidingScaleOnly(nextVal);
                    loadData({ slidingScale: nextVal });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.switchThumb, slidingScaleOnly && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Update Preferences Button */}
              <TouchableOpacity
                style={[styles.updatePreferencesBtn, updateFeedback && styles.updatePreferencesBtnSuccess]}
                onPress={handleUpdatePreferences}
                activeOpacity={0.85}
              >
                <Text style={styles.updatePreferencesBtnText}>
                  {updateFeedback ? '✓ Preferences Applied' : 'Update Preferences'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* National Crisis Helplines Card (India) */}
            <View style={styles.crisisCard}>
              <View style={styles.crisisHeaderRow}>
                <View style={styles.crisisIconBox}>
                  <Text style={styles.crisisIcon}>🛟</Text>
                </View>
                <Text style={styles.crisisCardTitle}>Need immediate support?</Text>
              </View>

              <Text style={styles.crisisDesc}>
                If stress feels overwhelming or acute today, free 24/7 confidential helplines are available across India.
              </Text>

              <TouchableOpacity style={styles.crisisActionBtn} onPress={handleCallCrisis} activeOpacity={0.85}>
                <View style={styles.crisisActionLeft}>
                  <Text style={styles.crisisCallIcon}>📞</Text>
                  <Text style={styles.crisisActionText}>Tele-MANAS &amp; Helplines</Text>
                </View>
                <Text style={styles.crisisActionSubtext}>Toll-Free • 24/7 • India</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <View style={[styles.footer, isMobile && { flexDirection: 'column', gap: 12 }]}>
          <Text style={styles.footerBrand}>
            🌰 Breadcrumbs • A warm, low-pressure ritual to nourish mindful headspace.
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={onNavigateToCheckIn}>
              <Text style={styles.footerLink}>Reflect</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { fontWeight: '700' }]}>Find Care</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenAuth}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ─── Modal 1: National Mental Health Helplines (India) ──────────── */}
      {crisisModalVisible && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCrisisModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.crisisModalBox}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>🛟</Text>
                  <Text style={[styles.modalHeaderTitle, { color: '#991B1B' }]}>National Crisis Helplines (India)</Text>
                </View>
                <TouchableOpacity onPress={() => setCrisisModalVisible(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.crisisModalDesc}>
                Free, toll-free, and confidential mental health support is available 24/7 across all states in India.
              </Text>

              {/* 3 Verified Indian Helplines */}
              <View style={styles.crisisOptionsList}>
                {/* 1. Tele-MANAS (Govt of India, MoHFW) */}
                <TouchableOpacity
                  style={styles.crisisOptionBtn}
                  onPress={() => dialPhoneNumber('14416')}
                >
                  <Text style={styles.crisisOptionIcon}>📞</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crisisOptionTitle}>Tele-MANAS: Call 14416</Text>
                    <Text style={styles.crisisOptionSubtitle}>Govt of India 24/7 Toll-Free National Mental Health Helpline</Text>
                  </View>
                  <Text style={styles.crisisOptionArrow}>→</Text>
                </TouchableOpacity>

                {/* 2. KIRAN Helpline (MSJE) */}
                <TouchableOpacity
                  style={[styles.crisisOptionBtn, { borderColor: '#3B7A57' }]}
                  onPress={() => dialPhoneNumber('18005990019')}
                >
                  <Text style={styles.crisisOptionIcon}>📞</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.crisisOptionTitle, { color: '#2D5E43' }]}>KIRAN: 1800-599-0019</Text>
                    <Text style={styles.crisisOptionSubtitle}>Ministry of Social Justice 24/7 Mental Health Helpline</Text>
                  </View>
                  <Text style={styles.crisisOptionArrow}>→</Text>
                </TouchableOpacity>

                {/* 3. Vandrevala Foundation */}
                <TouchableOpacity
                  style={styles.crisisOptionBtn}
                  onPress={() => dialPhoneNumber('+919999666555')}
                >
                  <Text style={styles.crisisOptionIcon}>💬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crisisOptionTitle}>Vandrevala Foundation: 9999 666 555</Text>
                    <Text style={styles.crisisOptionSubtitle}>24/7 Free Crisis Counseling &amp; WhatsApp Support</Text>
                  </View>
                  <Text style={styles.crisisOptionArrow}>→</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeCrisisModalBtn}
                onPress={() => setCrisisModalVisible(false)}
              >
                <Text style={styles.closeCrisisModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── Modal 2: Contact Practice Quick Sheet ─────────────────────── */}
      {selectedTherapistForCall && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedTherapistForCall(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.profileModalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Practitioner Contact (Demo Sample)</Text>
                <TouchableOpacity onPress={() => setSelectedTherapistForCall(null)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileTopRow}>
                <View style={styles.avatarModalCircle}>
                  <Text style={styles.avatarModalInitials}>
                    {getInitials(selectedTherapistForCall.name)}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.modalTherapistName}>{selectedTherapistForCall.name}</Text>
                  <Text style={styles.modalTherapistSubtitle}>{selectedTherapistForCall.title}</Text>
                </View>
              </View>

              <View style={styles.contactDetailsCard}>
                <Text style={styles.contactCardTitle}>📋 Practice Details &amp; Fee</Text>
                <Text style={styles.contactCardLine}>
                  💳 <Text style={styles.contactCardBold}>Session Fee:</Text> {selectedTherapistForCall.price || '₹1,200 / session'}
                </Text>
                <Text style={styles.contactCardLine}>
                  📍 <Text style={styles.contactCardBold}>Location:</Text> {selectedTherapistForCall.address || 'Bengaluru & Telehealth (Pan-India)'}
                </Text>
                <Text style={styles.contactCardLine}>
                  🕒 <Text style={styles.contactCardBold}>Consultation Hours:</Text> Mon–Fri (10:00 AM – 6:00 PM IST)
                </Text>
                <Text style={styles.contactCardLine}>
                  🌱 <Text style={styles.contactCardBold}>Sliding Scale:</Text> {selectedTherapistForCall.sliding_scale ? 'Available for students / income-flexible' : 'Standard fee'}
                </Text>
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCallBtn}
                  onPress={() => dialPhoneNumber(selectedTherapistForCall.phone)}
                >
                  <Text style={styles.modalCallBtnText}>📞 Sample Hotline ({selectedTherapistForCall.phone || '14416'})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalWebsiteBtn}
                  onPress={() => openExternalLink('https://telemanas.mohfw.gov.in')}
                >
                  <Text style={styles.modalWebsiteBtnText}>🌐 Tele-MANAS Portal ↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── Modal 3: View Full Practitioner Info & Reviews ─────────────── */}
      {selectedTherapistForProfile && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedTherapistForProfile(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.profileModalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Practitioner Profile (Sample)</Text>
                <TouchableOpacity onPress={() => setSelectedTherapistForProfile(null)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                <View style={styles.profileTopRow}>
                  <View style={styles.avatarModalCircle}>
                    <Text style={styles.avatarModalInitials}>
                      {getInitials(selectedTherapistForProfile.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.modalTherapistName}>{selectedTherapistForProfile.name}</Text>
                    <Text style={styles.modalTherapistSubtitle}>{selectedTherapistForProfile.title}</Text>
                    <Text style={styles.profileRatingText}>
                      ★ {selectedTherapistForProfile.rating || 4.9} ({selectedTherapistForProfile.review_count || '89 mindful reviews'})
                    </Text>
                  </View>
                </View>

                {/* Direct Contact & Rates Box */}
                <View style={styles.contactDetailsCard}>
                  <Text style={styles.contactCardTitle}>📋 Practice Details &amp; Cost</Text>
                  <Text style={styles.contactCardLine}>
                    💰 <Text style={styles.contactCardBold}>Session Fee:</Text> {selectedTherapistForProfile.price || '₹1,200 / session'}
                  </Text>
                  <Text style={styles.contactCardLine}>
                    📍 <Text style={styles.contactCardBold}>Location:</Text> {selectedTherapistForProfile.address || 'Bengaluru & Telehealth'}
                  </Text>
                  <Text style={styles.contactCardLine}>
                    🌱 <Text style={styles.contactCardBold}>Sliding Scale:</Text> {selectedTherapistForProfile.sliding_scale ? 'Available for students / flexible income' : 'Standard rates'}
                  </Text>
                </View>

                <Text style={styles.profileSectionTitle}>Clinical Philosophy &amp; Approach</Text>
                <Text style={styles.profileBioText}>
                  {selectedTherapistForProfile.bio || 'Specializes in compassionate cognitive-behavioral tools and grounding practices for individuals facing workplace demands, emotional fatigue, and life transitions.'}
                </Text>

                <Text style={styles.profileSectionTitle}>Accepted Insurance &amp; Coverage</Text>
                <View style={styles.insurancePillsRow}>
                  {(selectedTherapistForProfile.insurances || ['Star Health', 'HDFC ERGO', 'Self-pay']).map((ins) => (
                    <View key={ins} style={styles.insurancePill}>
                      <Text style={styles.insurancePillText}>✓ {ins}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCallBtn}
                  onPress={() => dialPhoneNumber(selectedTherapistForProfile.phone)}
                >
                  <Text style={styles.modalCallBtnText}>📞 Sample Line ({selectedTherapistForProfile.phone || '14416'})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalWebsiteBtn}
                  onPress={() => openExternalLink('https://telemanas.mohfw.gov.in')}
                >
                  <Text style={styles.modalWebsiteBtnText}>🌐 Tele-MANAS Portal ↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Calendar Timeline Modal */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        userId={userId}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        userId={userId}
        onSelectUser={() => {}}
        onOpenReport={() => {}}
        onSignOut={onSignOut}
        backendOnline={true}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5ED',
    width: '100%',
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  // ─── Navbar ─────────────────────────────────────────────────────────────
  navbar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 18,
    backgroundColor: '#FAF5ED',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92, 58, 33, 0.08)',
  },
  navbarMobile: {
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  navBrandName: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#4A2E18',
    letterSpacing: -0.3,
  },
  navBrandTag: {
    fontSize: 11,
    color: '#8C6239',
    letterSpacing: 0.2,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B4D36',
  },
  navBtnActive: {
    backgroundColor: '#F6E3D5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  navBtnActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A2E18',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.1)',
    gap: 8,
  },
  dateBadgeIcon: {
    fontSize: 12,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5C3A21',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EAD7C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C3A21',
  },

  // ─── Main Canvas ────────────────────────────────────────────────────────
  mainCanvas: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingTop: 28,
    gap: 28,
  },
  mainCanvasMobile: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },

  // ─── Left Column ────────────────────────────────────────────────────────
  leftColumn: {
    flex: 1.85,
    flexDirection: 'column',
    gap: 20,
  },
  leftColumnMobile: {
    flex: 1,
    width: '100%',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.09)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  heroLeftHeader: {
    flex: 1,
  },
  algorithmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  algorithmBadgeIcon: {
    fontSize: 12,
    color: '#C27038',
  },
  algorithmBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#C27038',
  },
  heroTitle: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#3B2313',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroTitleItalic: {
    fontStyle: 'italic',
    color: '#5C3A21',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#7D5838',
    lineHeight: 20,
  },

  providerCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EBDCCE',
  },
  providerCountNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4A2E18',
    lineHeight: 24,
  },
  providerCountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C6239',
  },

  // Filter Chips Row
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92, 58, 33, 0.08)',
  },
  refinedByLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8C6239',
    marginRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF1E6',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.12)',
    gap: 6,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5C3A21',
  },
  filterChipClose: {
    fontSize: 10,
    color: '#8C6239',
    fontWeight: '700',
  },
  resetFiltersBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  resetFiltersText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B46824',
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#7D5838',
    fontStyle: 'italic',
  },

  emptyResultsBox: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.08)',
    gap: 10,
  },
  emptyResultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A2E18',
  },
  emptyResultsSubtitle: {
    fontSize: 13,
    color: '#8C6239',
    textAlign: 'center',
  },
  resetLargeBtn: {
    backgroundColor: '#5C3A21',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  resetLargeBtnText: {
    color: '#FFFDF9',
    fontWeight: '700',
    fontSize: 13,
  },

  // Therapist Card
  therapistCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  therapistCardMobile: {
    flexDirection: 'column',
    gap: 14,
  },

  avatarIconBadgeContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignSelf: 'flex-start',
  },
  avatarBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBDCCE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 58, 33, 0.15)',
  },
  avatarBadgeInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5C3A21',
    fontFamily: 'Fraunces, Georgia, serif',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B7A57',
    borderWidth: 2,
    borderColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  nameContainer: {
    flex: 1,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3B2313',
    marginBottom: 2,
  },
  therapistTitle: {
    fontSize: 12,
    color: '#7D5838',
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF1E6',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBDCCE',
  },
  specialtyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C3A21',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  metaItem: {
    fontSize: 12,
    color: '#5C3A21',
  },
  metaBold: {
    fontWeight: '700',
    color: '#3B2313',
  },
  metaMuted: {
    color: '#8C6239',
  },
  metaDivider: {
    color: '#D4BFA7',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  callPracticeBtn: {
    backgroundColor: '#4A2E18',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  callPracticeBtnText: {
    color: '#FFFDF9',
    fontSize: 12,
    fontWeight: '700',
  },
  viewProfileBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.25)',
  },
  viewProfileBtnText: {
    color: '#5C3A21',
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.1)',
  },
  bookmarkBtnSaved: {
    backgroundColor: '#F5E1D0',
    borderColor: '#C27038',
  },
  bookmarkIcon: {
    fontSize: 14,
  },

  // Callout Card
  calloutCard: {
    backgroundColor: '#FAF1E6',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.08)',
  },
  calloutIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutIcon: {
    fontSize: 20,
  },
  calloutTextBox: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B2313',
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#7D5838',
    lineHeight: 18,
  },

  // ─── Right Column ───────────────────────────────────────────────────────
  rightColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 20,
  },
  rightColumnMobile: {
    flex: 1,
    width: '100%',
  },

  sidebarCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.09)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  sidebarCardTitle: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#3B2313',
    marginBottom: 4,
  },
  sidebarCardSubtitle: {
    fontSize: 12,
    color: '#8C6239',
    marginBottom: 18,
  },
  prefSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8C6239',
    marginBottom: 8,
  },

  formatButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  formatBtn: {
    flex: 1,
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  formatBtnActive: {
    backgroundColor: '#4A2E18',
    borderColor: '#4A2E18',
  },
  formatBtnIcon: {
    fontSize: 16,
  },
  formatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C3A21',
  },
  formatBtnTextActive: {
    color: '#FFFDF9',
  },

  genderPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  genderPill: {
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  genderPillActive: {
    backgroundColor: '#4A2E18',
    borderColor: '#4A2E18',
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5C3A21',
  },
  genderPillTextActive: {
    color: '#FFFDF9',
    fontWeight: '700',
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92, 58, 33, 0.08)',
    marginBottom: 16,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B2313',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#8C6239',
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E4D5C5',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#3B7A57',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFDF9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },

  updatePreferencesBtn: {
    backgroundColor: '#5C3A21',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updatePreferencesBtnSuccess: {
    backgroundColor: '#3B7A57',
  },
  updatePreferencesBtnText: {
    color: '#FFFDF9',
    fontWeight: '700',
    fontSize: 13,
  },

  // Crisis Card
  crisisCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.15)',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  crisisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  crisisIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisIcon: {
    fontSize: 16,
  },
  crisisCardTitle: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  crisisDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: 16,
  },
  crisisActionBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crisisActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crisisCallIcon: {
    fontSize: 14,
  },
  crisisActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  crisisActionSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '600',
  },

  // Footer
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92, 58, 33, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
  },
  footerBrand: {
    fontSize: 12,
    color: '#8C6239',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  footerLink: {
    fontSize: 12,
    color: '#5C3A21',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileModalBox: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    maxWidth: 520,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  crisisModalBox: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92, 58, 33, 0.08)',
  },
  modalHeaderTitle: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 17,
    fontWeight: '700',
    color: '#3B2313',
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#8C6239',
    fontWeight: '700',
  },
  crisisModalDesc: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 19,
    marginBottom: 16,
  },

  crisisOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  crisisOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    gap: 12,
  },
  crisisOptionIcon: {
    fontSize: 22,
  },
  crisisOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  crisisOptionSubtitle: {
    fontSize: 11,
    color: '#7D5838',
    marginTop: 2,
  },
  crisisOptionArrow: {
    fontSize: 16,
    color: '#8C6239',
    fontWeight: '700',
  },
  closeCrisisModalBtn: {
    backgroundColor: '#FAF1E6',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.12)',
  },
  closeCrisisModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C3A21',
  },

  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarModalCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBDCCE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 58, 33, 0.15)',
  },
  avatarModalInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5C3A21',
    fontFamily: 'Fraunces, Georgia, serif',
  },
  modalTherapistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B2313',
  },
  modalTherapistSubtitle: {
    fontSize: 11,
    color: '#7D5838',
    marginTop: 2,
  },
  profileRatingText: {
    fontSize: 12,
    color: '#C27038',
    fontWeight: '700',
    marginTop: 4,
  },

  contactDetailsCard: {
    backgroundColor: '#FAF5ED',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.08)',
  },
  contactCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A2E18',
    marginBottom: 2,
  },
  contactCardLine: {
    fontSize: 12,
    color: '#5C3A21',
  },
  contactCardBold: {
    fontWeight: '700',
    color: '#3B2313',
  },

  profileSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B2313',
    marginTop: 10,
    marginBottom: 4,
  },
  profileBioText: {
    fontSize: 12,
    color: '#6B4D36',
    lineHeight: 18,
  },
  insurancePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  insurancePill: {
    backgroundColor: '#FAF5ED',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.12)',
  },
  insurancePillText: {
    fontSize: 11,
    color: '#3B7A57',
    fontWeight: '600',
  },

  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92, 58, 33, 0.08)',
  },
  modalCallBtn: {
    flex: 1.3,
    backgroundColor: '#4A2E18',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCallBtnText: {
    color: '#FFFDF9',
    fontWeight: '700',
    fontSize: 12,
  },
  modalWebsiteBtn: {
    flex: 1,
    backgroundColor: '#FAF1E6',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92, 58, 33, 0.15)',
  },
  modalWebsiteBtnText: {
    color: '#5C3A21',
    fontWeight: '700',
    fontSize: 12,
  },
});
