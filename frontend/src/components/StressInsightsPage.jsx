import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { fetchUserReport, fetchUserThreads, fetchUserEntries, checkBackendStatus } from '../services/api';

export default function StressInsightsPage({ account, onBack, onNavigateToCheckIn }) {
  const userId = account?.user_id || 'demo_escalating';
  const displayName = account?.display_name || 'Alex Rivera';

  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [report, setReport] = useState(null);
  const [threads, setThreads] = useState([]);
  const [entries, setEntries] = useState([]);
  const [timeFilter, setTimeFilter] = useState('today'); // 'today' | 'week' | 'month'
  const [activeTab, setActiveTab] = useState('insights'); // 'checkin' | 'insights' | 'history' | 'settings'

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const online = await checkBackendStatus();
      setBackendOnline(online);

      try {
        const [rep, ths, ents] = await Promise.all([
          fetchUserReport(userId),
          fetchUserThreads(userId),
          fetchUserEntries(userId),
        ]);
        setReport(rep);
        setThreads(ths || []);
        setEntries(ents || []);
      } catch (err) {
        console.warn('Error fetching stress insights data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  // Transform backend categories & ML predictions into visual cards
  const categoriesList = threads.length > 0
    ? threads.map((th) => {
        const scorePct = Math.round((th.latest_score || th.current_decay_score || 0.5) * 100);
        let sevLabel = 'Mild';
        if (scorePct >= 70 || th.severity === 'high' || th.severity === 'flagged') sevLabel = 'High';
        else if (scorePct >= 40 || th.severity === 'medium') sevLabel = 'Moderate';

        const quote = th.latest_reason || (th.recent_triggers && th.recent_triggers[0]) || 'Daily check-in reflection analyzed by ML pipeline.';

        return {
          category: th.category || 'General Stress',
          percentage: scorePct,
          severityLabel: sevLabel,
          quote: `"${quote}"`,
          trend: th.trend,
        };
      })
    : [
        {
          category: 'Work & Deadlines',
          percentage: 74,
          severityLabel: 'High',
          quote: '"3 consecutive deadlines back to back before the holiday cutoff."',
          trend: 'escalating',
        },
        {
          category: 'Physical & Energy',
          percentage: 46,
          severityLabel: 'Moderate',
          quote: '"Skipped afternoon stroll; posture felt tight toward 3 PM."',
          trend: 'stable',
        },
        {
          category: 'Social Dynamics',
          percentage: 22,
          severityLabel: 'Mild',
          quote: '"Supportive 15-minute coffee chat with Sarah grounded me."',
          trend: 'improving',
        },
        {
          category: 'Mind Clutter & Worry',
          percentage: 35,
          severityLabel: 'Mild',
          quote: '"Evening acoustic guitar and warm tea cleared the loop."',
          trend: 'stable',
        },
      ];

  const getCategoryIcon = (cat) => {
    const c = cat.toLowerCase();
    if (c.includes('work') || c.includes('career') || c.includes('deadline')) return '🗓️';
    if (c.includes('health') || c.includes('physical') || c.includes('body')) return '🧘';
    if (c.includes('social') || c.includes('relationship') || c.includes('friend') || c.includes('family')) return '🌱';
    return '💭';
  };

  const getSeverityBadgeStyle = (label) => {
    switch (label) {
      case 'High':
        return { bg: '#5A2E17', text: '#FFFDF7' };
      case 'Moderate':
        return { bg: '#F8CCA9', text: '#5A2E17' };
      default:
        return { bg: '#EBD8C8', text: '#6D4428' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
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

        {/* Navigation Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'checkin' && styles.navTabActive]}
            onPress={() => {
              setActiveTab('checkin');
              if (onNavigateToCheckIn) onNavigateToCheckIn();
            }}
          >
            <Text style={[styles.navTabText, activeTab === 'checkin' && styles.navTabTextActive]}>
              Check-in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'insights' && styles.navTabActive]}
            onPress={() => setActiveTab('insights')}
          >
            <Text style={[styles.navTabText, activeTab === 'insights' && styles.navTabTextActive]}>
              Stress Insights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('history')}>
            <Text style={styles.navTabText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTab} onPress={() => setActiveTab('settings')}>
            <Text style={styles.navTabText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Right Header: Date + Profile */}
        <View style={styles.navRight}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>📅 Today, Oct 24</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ML Status Banner */}
        <View style={styles.statusBanner}>
          <View style={[styles.statusDot, { backgroundColor: backendOnline ? '#16A34A' : '#D97706' }]} />
          <Text style={styles.statusBannerText}>
            {backendOnline
              ? '✨ Live ML Backend Connected — Predictions computed with DistilBERT + NLP Keyword Categorization'
              : '⚡ Backend Offline — Displaying local simulated ML analysis'}
          </Text>
        </View>

        {/* Page Header Area */}
        <View style={styles.pageHeader}>
          <View>
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back to Daily Check-in</Text>
            </TouchableOpacity>

            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>Your Daily Stress Profile</Text>
              <View style={styles.updatedBadge}>
                <Text style={styles.updatedBadgeText}>Updated 12m ago</Text>
              </View>
            </View>

            <Text style={styles.pageSubtitle}>
              A gentle look into your day's rhythms, gentle crests, and mindful emotional crumbs.
            </Text>
          </View>

          {/* Time View Filter Pill Group */}
          <View style={styles.filterGroup}>
            <View style={styles.filterPillContainer}>
              <TouchableOpacity
                style={[styles.filterPill, timeFilter === 'today' && styles.filterPillActive]}
                onPress={() => setTimeFilter('today')}
              >
                <Text style={[styles.filterPillText, timeFilter === 'today' && styles.filterPillTextActive]}>
                  Today, Oct 24
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, timeFilter === 'week' && styles.filterPillActive]}
                onPress={() => setTimeFilter('week')}
              >
                <Text style={[styles.filterPillText, timeFilter === 'week' && styles.filterPillTextActive]}>
                  Week view
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, timeFilter === 'month' && styles.filterPillActive]}
                onPress={() => setTimeFilter('month')}
              >
                <Text style={[styles.filterPillText, timeFilter === 'month' && styles.filterPillTextActive]}>
                  Month view
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.iconActionBtn} accessibilityLabel="Download report">
              <Text style={styles.iconActionText}>📥</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn} accessibilityLabel="Calendar view">
              <Text style={styles.iconActionText}>🗓️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Grid: Waveform + Categories */}
        <View style={styles.mainGrid}>
          {/* Left Card: Tonal Waveform (Stress Rhythm) */}
          <View style={styles.waveformCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEyebrow}>※ TONAL WAVEFORM</Text>
              <Text style={styles.cardHeading}>Stress Rhythm</Text>
              <Text style={styles.cardSubheading}>
                Hover along the crumb trail to trace emotional pressure
              </Text>
            </View>

            {/* Waveform Visualization Canvas/SVG representation */}
            <View style={styles.waveformArea}>
              {/* Tooltip on Peak */}
              <View style={styles.peakTooltip}>
                <Text style={styles.peakTooltipTime}>2:00 PM • Peak 74%</Text>
                <Text style={styles.peakTooltipQuote}>"Client sync & tight deadline"</Text>
              </View>

              {/* Calm point */}
              <View style={styles.calmBadge}>
                <Text style={styles.calmBadgeText}>☀️ 8 AM Calm 22%</Text>
              </View>

              {/* Curve Graphic */}
              <svg
                width="100%"
                height="170"
                viewBox="0 0 450 170"
                fill="none"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C96B4F" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#E39B7A" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#F5D7B5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Filled Area */}
                <path
                  d="M 20 120 Q 90 120, 140 100 T 235 40 T 330 85 T 420 115 L 420 160 L 20 160 Z"
                  fill="url(#waveGradient)"
                />

                {/* Main Curve */}
                <path
                  d="M 20 120 Q 90 120, 140 100 T 235 40 T 330 85 T 420 115"
                  stroke="#A85338"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Baseline Guide */}
                <line x1="20" y1="120" x2="420" y2="120" stroke="#D1B89F" strokeWidth="1" strokeDasharray="4 4" />

                {/* Data Points */}
                <circle cx="80" cy="118" r="5" fill="#FFF8F0" stroke="#C96B4F" strokeWidth="2.5" />
                <circle cx="140" cy="100" r="5" fill="#FFF8F0" stroke="#C96B4F" strokeWidth="2.5" />
                <circle cx="235" cy="40" r="7" fill="#C96B4F" stroke="#FFF8F0" strokeWidth="3" />
                <circle cx="330" cy="85" r="5" fill="#FFF8F0" stroke="#C96B4F" strokeWidth="2.5" />
                <circle cx="395" cy="112" r="5" fill="#FFF8F0" stroke="#9E7852" strokeWidth="2" />
              </svg>

              {/* Time Labels */}
              <View style={styles.timeAxis}>
                <View style={styles.timeAxisItem}>
                  <Text style={styles.timeLabel}>8 AM</Text>
                  <Text style={styles.timeSub}>Calm (22%)</Text>
                </View>
                <View style={styles.timeAxisItem}>
                  <Text style={styles.timeLabel}>11 AM</Text>
                  <Text style={styles.timeSub}>Rising (38%)</Text>
                </View>
                <View style={styles.timeAxisItem}>
                  <Text style={styles.timeLabel}>2 PM</Text>
                  <Text style={styles.timeSub}>Peak (74%)</Text>
                </View>
                <View style={styles.timeAxisItem}>
                  <Text style={styles.timeLabel}>5 PM</Text>
                  <Text style={styles.timeSub}>Settling (51%)</Text>
                </View>
                <View style={styles.timeAxisItem}>
                  <Text style={styles.timeLabel}>9 PM</Text>
                  <Text style={styles.timeSub}>Winding down (28%)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Card: Stress Categories (Detailed Decomposition) */}
          <View style={styles.categoriesCard}>
            <View style={styles.categoriesHeaderRow}>
              <View>
                <Text style={styles.cardEyebrow}>DETAILED DECOMPOSITION</Text>
                <Text style={styles.cardHeading}>Stress Categories</Text>
              </View>
              <View style={styles.pieIconCircle}>
                <Text style={{ fontSize: 18 }}>📊</Text>
              </View>
            </View>

            <Text style={styles.categoriesSubheading}>
              Identified through your check-in prompts, voice notes, and emotional tag selections.
            </Text>

            {/* List of Category Cards */}
            <View style={styles.categoriesList}>
              {categoriesList.map((item, index) => {
                const badge = getSeverityBadgeStyle(item.severityLabel);
                return (
                  <View key={index} style={styles.categoryItem}>
                    {/* Header: Title + Percent + Badge */}
                    <View style={styles.catHeader}>
                      <View style={styles.catTitleGroup}>
                        <Text style={styles.catIcon}>{getCategoryIcon(item.category)}</Text>
                        <Text style={styles.catName}>{item.category}</Text>
                      </View>
                      <View style={styles.catScoreGroup}>
                        <Text style={styles.catPercent}>{item.percentage}%</Text>
                        <View style={[styles.catBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.catBadgeText, { color: badge.text }]}>
                            {item.severityLabel}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.catProgressBarTrack}>
                      <View
                        style={[
                          styles.catProgressBarFill,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor:
                              item.percentage > 70
                                ? '#6D3F28'
                                : item.percentage > 40
                                ? '#D78B5D'
                                : '#8D9B6A',
                          },
                        ]}
                      />
                    </View>

                    {/* Extracted Trigger Quote */}
                    <View style={styles.catQuoteBox}>
                      <Text style={styles.quoteIcon}>🗨️</Text>
                      <Text style={styles.catQuoteText}>{item.quote}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Bottom Snapshot Card: Weekly Balance */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyLeft}>
            <View style={styles.weeklyIconCircle}>
              <Text style={{ fontSize: 18 }}>📈</Text>
            </View>
            <View style={styles.weeklyTextGroup}>
              <Text style={styles.weeklyHeading}>Weekly Balance Snapshot</Text>
              <Text style={styles.weeklySubtitle}>
                You've logged {entries.length || 5} uninterrupted crumb reflections this week. Wednesday remains your lowest stress day.
              </Text>
            </View>
          </View>

          <View style={styles.weeklyRight}>
            {/* Days Streak */}
            <View style={styles.daysStreakContainer}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <View key={i} style={styles.dayCol}>
                  <Text style={styles.dayLabel}>{d}</Text>
                  <View
                    style={[
                      styles.dayDot,
                      i < 5 ? styles.dayDotActive : styles.dayDotInactive,
                    ]}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.archiveBtn}>
              <Text style={styles.archiveBtnText}>Full Archive</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            🍞 Breadcrumbs • A warm, low-pressure ritual to nourish mindful headspace.
          </Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Reflect</Text>
            <Text style={styles.footerLink}>Patterns</Text>
            <Text style={styles.footerLink}>Gentle Reminders</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7EFE8',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#F7EFE8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 46, 24, 0.06)',
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
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 3,
    gap: 4,
  },
  navTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  navTabActive: {
    backgroundColor: '#F5C6AA',
  },
  navTabText: {
    fontSize: 13,
    color: '#6B4423',
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#4A2E18',
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBadge: {
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
  },
  dateBadgeText: {
    fontSize: 12,
    color: '#5C3818',
    fontWeight: '600',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9D8C0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.2)',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C3818',
  },

  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDF9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBannerText: {
    fontSize: 11,
    color: '#6B4423',
    fontWeight: '500',
  },

  // Page Header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    flexWrap: 'wrap',
    gap: 16,
  },
  backLink: {
    marginBottom: 6,
  },
  backLinkText: {
    fontSize: 12,
    color: '#7C522D',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    letterSpacing: -0.3,
  },
  updatedBadge: {
    backgroundColor: '#F8D8C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  updatedBadgeText: {
    fontSize: 10,
    color: '#6D4428',
    fontWeight: '600',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B4423',
    lineHeight: 18,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#EBDCCE',
    borderRadius: 20,
    padding: 3,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: '#F8D8C3',
  },
  filterPillText: {
    fontSize: 12,
    color: '#6B4423',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#4A2E18',
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.1)',
  },
  iconActionText: {
    fontSize: 13,
  },

  // Main Grid Layout
  mainGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },

  // Left Card: Waveform
  waveformCard: {
    flex: 1.1,
    minWidth: 320,
    backgroundColor: '#FFF8F0',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9C6F4B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A1F09',
    fontFamily: 'Fraunces',
    marginBottom: 4,
  },
  cardSubheading: {
    fontSize: 12,
    color: '#7C522D',
    marginBottom: 16,
  },
  waveformArea: {
    position: 'relative',
    marginTop: 10,
  },
  peakTooltip: {
    position: 'absolute',
    top: -10,
    left: '42%',
    backgroundColor: '#351F10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  peakTooltipTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFDF9',
    textAlign: 'center',
  },
  peakTooltipQuote: {
    fontSize: 10,
    color: '#E8D4C3',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  calmBadge: {
    position: 'absolute',
    top: 70,
    left: '8%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(109, 67, 48, 0.15)',
  },
  calmBadgeText: {
    fontSize: 10,
    color: '#7C522D',
    fontWeight: '600',
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.08)',
  },
  timeAxisItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A2E18',
  },
  timeSub: {
    fontSize: 9,
    color: '#8D633D',
  },

  // Right Card: Stress Categories
  categoriesCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#FFF8F0',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    shadowColor: '#4A2E18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  categoriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pieIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3DFC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesSubheading: {
    fontSize: 12,
    color: '#7C522D',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catIcon: {
    fontSize: 13,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A2E18',
  },
  catScoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C3818',
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catProgressBarTrack: {
    height: 6,
    backgroundColor: '#EFE1D3',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catQuoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(247, 239, 232, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  quoteIcon: {
    fontSize: 11,
    marginTop: 1,
  },
  catQuoteText: {
    fontSize: 11,
    color: '#6B4423',
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 15,
  },

  // Bottom Snapshot Card
  weeklyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.08)',
    flexWrap: 'wrap',
    gap: 16,
  },
  weeklyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  weeklyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6D9C5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyTextGroup: {
    flex: 1,
  },
  weeklyHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A2E18',
    fontFamily: 'Fraunces',
    marginBottom: 2,
  },
  weeklySubtitle: {
    fontSize: 12,
    color: '#6B4423',
    lineHeight: 16,
  },
  weeklyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  daysStreakContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C522D',
  },
  dayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dayDotActive: {
    backgroundColor: '#6D4330',
  },
  dayDotInactive: {
    backgroundColor: '#EAD7C6',
  },
  archiveBtn: {
    backgroundColor: '#FDECE0',
    borderWidth: 1,
    borderColor: 'rgba(74, 46, 24, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C3818',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 46, 24, 0.08)',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerBrand: {
    fontSize: 11,
    color: '#7C522D',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLink: {
    fontSize: 11,
    color: '#7C522D',
    fontWeight: '600',
  },
});
