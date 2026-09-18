/**
 * api.js
 * 
 * Networking client for Breadcrumbs FastAPI Backend (http://127.0.0.1:8000)
 * Includes robust offline/demo fallbacks for all three clinical personas:
 *   - demo_escalating
 *   - demo_improving
 *   - demo_flagged
 */

const BASE_URL = 'http://127.0.0.1:8000';

// In-memory fallback entries when backend is offline
const fallbackEntries = {
  demo_escalating: [
    { entry_id: 'e1', date: new Date(Date.now() - 13*86400000).toISOString(), transcript: "Work is fine, just a normal amount of deadlines.", category: "Work/Career", stress_score: 0.35, confidence: 0.82 },
    { entry_id: 'e2', date: new Date(Date.now() - 10*86400000).toISOString(), transcript: "A bit more pressure this week with the new project.", category: "Work/Career", stress_score: 0.45, confidence: 0.85 },
    { entry_id: 'e3', date: new Date(Date.now() - 7*86400000).toISOString(), transcript: "My manager keeps piling on deadlines, feeling stretched thin.", category: "Work/Career", stress_score: 0.58, confidence: 0.87 },
    { entry_id: 'e4', date: new Date(Date.now() - 4*86400000).toISOString(), transcript: "Barely sleeping, work has been completely overwhelming.", category: "Work/Career", stress_score: 0.71, confidence: 0.90 },
    { entry_id: 'e5', date: new Date(Date.now() - 1*86400000).toISOString(), transcript: "I can't keep up anymore, every day feels like drowning at work.", category: "Work/Career", stress_score: 0.83, confidence: 0.93 },
  ],
  demo_improving: [
    { entry_id: 'e6', date: new Date(Date.now() - 12*86400000).toISOString(), transcript: "Had a big disagreement with family, feeling really hurt.", category: "Family", stress_score: 0.72, confidence: 0.88 },
    { entry_id: 'e7', date: new Date(Date.now() - 8*86400000).toISOString(), transcript: "We talked through some things today. Still tense, but slightly clearer.", category: "Family", stress_score: 0.54, confidence: 0.86 },
    { entry_id: 'e8', date: new Date(Date.now() - 4*86400000).toISOString(), transcript: "Had a peaceful dinner together. Moving in a better direction.", category: "Family", stress_score: 0.38, confidence: 0.91 },
    { entry_id: 'e9', date: new Date(Date.now() - 1*86400000).toISOString(), transcript: "Feeling connected and supported today. Such a relief.", category: "Family", stress_score: 0.22, confidence: 0.95 },
  ],
  demo_flagged: [
    { entry_id: 'e10', date: new Date(Date.now() - 1*86400000).toISOString(), transcript: "I just can't take this anymore, I want to end it all.", category: "Mental Health", stress_score: 0.96, confidence: 0.98 },
  ]
};

export async function checkBackendStatus() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitTextEntry(userId, transcript) {
  try {
    const res = await fetch(`${BASE_URL}/entries/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, transcript }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend unavailable, using simulated response:', e.message);
  }

  // Simulated fallback response
  const lower = transcript.toLowerCase();
  let category = "General Reflection";
  let stress_score = 0.45;

  if (lower.includes("die") || lower.includes("kill") || lower.includes("end it") || lower.includes("suicide") || lower.includes("hopeless")) {
    category = "Crisis / Acute Risk";
    stress_score = 0.95;
  } else if (lower.includes("work") || lower.includes("deadline") || lower.includes("boss") || lower.includes("job") || lower.includes("career")) {
    category = "Work/Career";
    stress_score = 0.78;
  } else if (lower.includes("exam") || lower.includes("study") || lower.includes("school") || lower.includes("grade")) {
    category = "Academics";
    stress_score = 0.68;
  } else if (lower.includes("family") || lower.includes("mom") || lower.includes("dad") || lower.includes("partner") || lower.includes("friend")) {
    category = "Relationships";
    stress_score = 0.52;
  } else if (lower.includes("happy") || lower.includes("peace") || lower.includes("good") || lower.includes("great") || lower.includes("relaxed")) {
    category = "Wellbeing";
    stress_score = 0.18;
  }

  const simulated = {
    entry_id: 'mock-' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    date: new Date().toISOString(),
    transcript,
    category,
    stress_score,
    confidence: 0.91,
    similarity_group_id: null
  };

  if (!fallbackEntries[userId]) fallbackEntries[userId] = [];
  fallbackEntries[userId].push(simulated);
  return simulated;
}

export async function submitAudioEntry(userId, audioBlob) {
  try {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('audio', audioBlob, 'checkin.webm');

    const res = await fetch(`${BASE_URL}/entries/audio`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend audio endpoint unavailable, falling back to simulated transcript:', e.message);
  }

  return submitTextEntry(userId, "I had a busy and thoughtful day, making progress step by step.");
}

export async function fetchUserEntries(userId) {
  try {
    const res = await fetch(`${BASE_URL}/users/${userId}/entries`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }
  return fallbackEntries[userId] || [];
}

export async function fetchUserThreads(userId) {
  try {
    const res = await fetch(`${BASE_URL}/users/${userId}/threads`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  if (userId === 'demo_escalating') {
    return [{
      category: "Work/Career",
      trend: "escalating",
      severity: "high",
      entry_count: 5,
      latest_score: 0.83,
      current_decay_score: 0.742,
      active_stressor_count: 2
    }];
  } else if (userId === 'demo_improving') {
    return [{
      category: "Family",
      trend: "improving",
      severity: "low",
      entry_count: 4,
      latest_score: 0.22,
      current_decay_score: 0.315,
      active_stressor_count: 1
    }];
  } else if (userId === 'demo_flagged') {
    return [{
      category: "Mental Health",
      trend: "escalating",
      severity: "flagged",
      entry_count: 1,
      latest_score: 0.96,
      current_decay_score: 0.960,
      active_stressor_count: 1
    }];
  }
  return [];
}

export async function fetchUserOverview(userId) {
  try {
    const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(userId)}/overview`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  return {
    user_id: userId,
    wellbeing_label: userId === 'demo_flagged' ? "We're concerned about you — please reach out for help" : (userId === 'demo_escalating' ? "You seem to be going through a lot right now" : "Things look steady today"),
    active_area_count: 2,
    primary_area: "Work/Career",
    trend_summary: userId === 'demo_improving' ? "Things have been getting a little easier recently" : "Stress has been building over the past week",
    show_crisis_resources: userId === 'demo_flagged',
    entry_count_last_14_days: 5
  };
}

export async function fetchUserReport(userId, period = "last 14 days") {

  try {
    const res = await fetch(`${BASE_URL}/users/${userId}/report?period=${encodeURIComponent(period)}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  const isFlagged = userId === 'demo_flagged';
  const isEscalating = userId === 'demo_escalating';

  return {
    anonymous_id: userId,
    period,
    stressors: await fetchUserThreads(userId),
    overall_severity: isFlagged ? "flagged" : (isEscalating ? "high" : "low"),
    overall_decay_score: isFlagged ? 0.96 : (isEscalating ? 0.742 : 0.315),
    crisis_resources_shown: isFlagged
  };
}

export async function fetchTherapists(userId, category = "Work/Career", options = {}) {
  const { preferred_mode = "any", gender = "any", sliding_scale = null, insurance = "any", lat = null, lng = null, max_distance_km = 50 } = options;
  const params = new URLSearchParams();
  if (preferred_mode && preferred_mode !== 'any') params.append('preferred_mode', preferred_mode);
  if (gender && gender !== 'any') params.append('gender', gender);
  if (sliding_scale != null) params.append('sliding_scale', sliding_scale);
  if (insurance && insurance !== 'any') params.append('insurance', insurance);
  if (lat != null) params.append('lat', lat);
  if (lng != null) params.append('lng', lng);
  if (max_distance_km) params.append('max_distance_km', max_distance_km);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const url = `${BASE_URL}/users/${encodeURIComponent(userId)}/therapists/${encodeURIComponent(category)}${queryString}`;


  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend therapists endpoint unavailable, using simulated data:', e.message);
  }

  return [
    {
      id: "th_vance",
      name: "Dr. Elena Vance, Psy.D",
      title: "Licensed Clinical Psychologist (12 yrs exp)",
      specialty: category,
      tier: "intensive",
      modes: ["online", "offline"],
      address: "450 Sutter St, Suite 820, San Francisco, CA 94108",
      city: "San Francisco",
      rating: 4.9,
      review_count: "124 mindful reviews",
      next_available: "Tomorrow at 2:00 PM",
      price: "$140 / session (In-network)",
      gender: "female",
      insurances: ["BlueCross", "Aetna", "Out-of-network"],
      sliding_scale: true,
      match_percentage: 98,
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
      bio: "Specializes in workplace burnout, somatic grounding, CBT boundary restructuring, and chronic fatigue restoration."
    },
    {
      id: "th_thorne",
      name: "Marcus Thorne, LMFT",
      title: "Mindfulness & High-Stress Dynamics (8 yrs exp)",
      specialty: category,
      tier: "standard",
      modes: ["online", "offline"],
      address: "120 Montgomery St, San Francisco, CA 94104",
      city: "San Francisco",
      rating: 4.8,
      review_count: "89 reviews",
      next_available: "Thursday at 10:30 AM",
      price: "$125 / session",
      gender: "male",
      insurances: ["BlueCross", "Out-of-network"],
      sliding_scale: true,
      match_percentage: 95,
      avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80",
      bio: "Focuses on high-stakes career dynamics, mindfulness, and cognitive boundary restructuring."
    },
    {
      id: "th_lin",
      name: "Sophia Lin, LCSW",
      title: "Holistic Stress & Somatic Therapist (10 yrs exp)",
      specialty: category,
      tier: "standard",
      modes: ["online"],
      address: "Telehealth / Remote Consultation",
      city: "Online",
      rating: 5.0,
      review_count: "96 reviews",
      next_available: "Friday at 4:00 PM",
      price: "$130 / session",
      gender: "female",
      insurances: ["Aetna", "Out-of-network"],
      sliding_scale: true,
      match_percentage: 92,
      avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80",
      bio: "Holistic somatic therapist certified in nervous system restoration and tension de-escalation."
    }
  ];
}


export async function deleteUserData(userId) {
  try {
    const res = await fetch(`${BASE_URL}/users/${userId}/entries`, { method: 'DELETE' });
    if (res.ok) {
      delete fallbackEntries[userId];
      return true;
    }
  } catch (e) {
    delete fallbackEntries[userId];
    return true;
  }
  return false;
}

// ─── Account & Auth Management ──────────────────────────────────────────────

// In-memory fallback accounts for demo mode
const fallbackAccounts = {
  demo_escalating: { user_id: 'demo_escalating', display_name: 'Alex Rivera', role: 'patient', email: 'alex@example.com' },
  demo_improving: { user_id: 'demo_improving', display_name: 'Jordan Taylor', role: 'patient', email: 'jordan@example.com' },
  demo_flagged: { user_id: 'demo_flagged', display_name: 'Sam Harper', role: 'patient', email: 'sam@example.com' },
  th_chen: { user_id: 'th_chen', display_name: 'Dr. Amara Chen', role: 'therapist', email: 'amara.chen@clinic.org' }
};

export async function createAccount(userId, displayName, role = 'patient', email = null) {
  try {
    const res = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        display_name: displayName,
        role: role,
        email: email || undefined
      }),
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      return await res.json();
    } else if (res.status === 409) {
      throw new Error('This User ID is already registered.');
    }
  } catch (err) {
    if (err.message.includes('already registered')) throw err;
    console.warn('Backend accounts unavailable, saving simulated account:', err.message);
  }

  // Fallback simulation
  const newAccount = {
    user_id: userId,
    display_name: displayName,
    role: role,
    email: email || '',
    created_at: new Date().toISOString()
  };
  fallbackAccounts[userId] = newAccount;
  return newAccount;
}

export async function getAccount(userId) {
  try {
    const res = await fetch(`${BASE_URL}/accounts/${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }
  return fallbackAccounts[userId] || {
    user_id: userId,
    display_name: userId,
    role: userId.startsWith('th_') ? 'therapist' : 'patient',
    email: `${userId}@breadcrumbs.internal`,
    created_at: new Date().toISOString()
  };
}

export async function listAllUsers() {
  try {
    const res = await fetch(`${BASE_URL}/admin/users`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return data.user_ids || [];
    }
  } catch (e) {
    // fallback
  }
  return Object.keys(fallbackAccounts);
}

export async function getTherapistPatients(therapistId) {
  try {
    const res = await fetch(`${BASE_URL}/therapists/${encodeURIComponent(therapistId)}/patients`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  return [
    {
      patient_id: "demo_escalating",
      display_name: "Alex Rivera",
      linked_at: new Date(Date.now() - 14*86400000).toISOString(),
      overall_severity: "high",
      overall_decay_score: 0.742,
      active_stressor_count: 2,
      crisis_resources_shown: false
    },
    {
      patient_id: "demo_improving",
      display_name: "Jordan Taylor",
      linked_at: new Date(Date.now() - 10*86400000).toISOString(),
      overall_severity: "low",
      overall_decay_score: 0.315,
      active_stressor_count: 1,
      crisis_resources_shown: false
    },
    {
      patient_id: "demo_flagged",
      display_name: "Sam Harper",
      linked_at: new Date(Date.now() - 2*86400000).toISOString(),
      overall_severity: "flagged",
      overall_decay_score: 0.960,
      active_stressor_count: 1,
      crisis_resources_shown: true
    }
  ];
}

export async function linkTherapistPatient(therapistId, patientId) {
  try {
    const res = await fetch(`${BASE_URL}/therapists/${encodeURIComponent(therapistId)}/patients/${encodeURIComponent(patientId)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }
  return { therapist_id: therapistId, patient_id: patientId, linked_at: new Date().toISOString() };
}

