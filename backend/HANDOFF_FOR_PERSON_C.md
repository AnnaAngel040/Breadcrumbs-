# Handoff for Person C — Frontend + Semantic NLP

## Your Two Responsibilities

1. **Frontend** — Build the React/Flutter/web UI that calls the backend REST API
2. **Semantic NLP hook** — Implement `is_same_stressor(text_a, text_b) -> float`
   so the backend can refine thread groupings beyond just category names

---

## Part 1 — Semantic NLP Hook

### What to Implement

```python
def is_same_stressor(text_a: str, text_b: str) -> float:
    """
    Returns a similarity score in [0.0, 1.0].
    1.0 = definitely the same stressor
    0.0 = completely unrelated

    Example:
      is_same_stressor("yelled at by manager", "boss threatened to fire me") → ~0.85
      is_same_stressor("yelled at by manager", "exam tomorrow scares me")    → ~0.12
    """
```

### How Person B Wires It In

In `app/threading_logic.py` and `app/report.py`, there is already a hook:
```python
threads = build_threads(entries, similarity_fn=None)
```

When you deliver your function, Person B swaps in:
```python
from your_module import is_same_stressor
threads = build_threads(entries, similarity_fn=is_same_stressor)
```

The threshold for "same stressor" is currently **0.75** (see `threading_logic.py`).
If your embeddings produce a different scale, talk to Person B before changing this.

### Recommended Approach
- Use `sentence-transformers` (`all-MiniLM-L6-v2` is fast and small)
- Cosine similarity between embeddings
- Cache embeddings to avoid re-computing on every call

### What Happens Without Your Function
The backend falls back to **pure category threading** (groups by category name only).
Everything still works; threads are just coarser-grained. Your function makes them
semantically richer — e.g. "manager yelling" and "boss threats" stay together even
if categorised slightly differently.

---

## Part 2 — Frontend API Reference

### Base URL
```
http://localhost:8000
```

---

### User Journey Flow

```
1. Patient registers           POST /accounts
2. Patient records audio       POST /entries/audio
   (or types text)             POST /entries/text
3. Patient checks wellness     GET  /users/{user_id}/overview          ← safe, no clinical scores
4. Crisis?                     show_crisis_resources: true → show hotlines IMMEDIATELY
5. Therapist recommendations   GET  /users/{user_id}/therapists/{category}
6. Therapist registers         POST /accounts  (role="therapist")
7. Therapist sets profile      POST /therapists/{therapist_id}/profile
8. Therapist links patient     POST /therapists/{therapist_id}/patients/{patient_id}
9. Therapist views patients    GET  /therapists/{therapist_id}/patients
10. Therapist views report     GET  /therapists/{therapist_id}/patients/{patient_id}/report
```

---

### Endpoint Catalogue

#### POST /accounts
Register a new user.
```json
// Request
{
  "user_id": "alice_123",
  "display_name": "Alice",
  "role": "patient",          // or "therapist"
  "email": "alice@example.com"
}

// Response 201
{
  "user_id": "alice_123",
  "display_name": "Alice",
  "role": "patient",
  "email": "alice@example.com",
  "created_at": "2026-09-18T09:00:00+00:00"
}
```

---

#### POST /entries/audio
Upload an audio diary entry. Backend transcribes, analyses, stores.
```
Content-Type: multipart/form-data
Fields:
  user_id  (string)
  audio    (file — .webm, .mp3, .wav, .m4a)
```
Response: `EntryOut` (see below)

---

#### POST /entries/text
Submit a text entry directly.
```json
// Request
{ "user_id": "alice_123", "transcript": "I have so much work today..." }

// Response — EntryOut
{
  "entry_id": "uuid",
  "user_id": "alice_123",
  "date": "2026-09-18T09:05:00+00:00",
  "transcript": "I have so much work today...",
  "category": "Work/Career",
  "reason": "deadline pressure from manager",
  "stress_score": 0.74,
  "confidence": 0.88,
  "similarity_group_id": null
}
```

---

#### GET /users/{user_id}/overview  ← PATIENT DASHBOARD
```json
// Response — PatientOverviewOut
{
  "user_id": "alice_123",
  "wellbeing_label": "You seem stressed today",
  "active_area_count": 2,
  "primary_area": "Work/Career",
  "trend_summary": "Stress has been building over the past week",
  "show_crisis_resources": false,
  "entry_count_last_14_days": 8
}
```

**IMPORTANT:** If `show_crisis_resources` is `true`, show crisis hotlines **immediately
and prominently** at the top of the screen. This overrides all other UI elements.
Do NOT show this flag value as text — use it only to trigger the hotline UI.

Hotlines to show (hardcoded in frontend):
- iCall: 9152987821
- Vandrevala Foundation: 1860-2662-345
- NIMHANS: 080-46110007

---

#### GET /users/{user_id}/therapists/{category}
Fetch matched therapists. Send user's GPS if available.
```
Query params:
  preferred_mode    "online" | "offline" | "any"  (default: "any")
  lat               float  (optional)
  lng               float  (optional)
  max_distance_km   float  (default: 50.0)

Response — list of TherapistOut:
[
  {
    "id": "t001",
    "name": "Dr. Ananya Sharma",
    "specialty": "Work/Career",
    "tier": "premium",
    "modes": ["online", "offline"],
    "address": "12 MG Road",
    "city": "Bangalore",
    "lat": 12.9716,
    "lng": 77.5946,
    "distance_km": 4.2,
    "match_score": 0.91,
    "rating": 4.8
  }
]
```
Therapists are pre-ranked by the backend — show in returned order.
No booking integration — show therapist contact details and let user reach out directly.

---

#### Therapist Portal Endpoints

**POST /therapists/{therapist_id}/profile**
Therapist sets up their professional profile (after registering via /accounts).
```json
// Request
{
  "specialty": "Anxiety",
  "tier": "standard",
  "modes": ["online", "offline"],
  "address": "42 Park Street",
  "city": "Mumbai",
  "lat": 19.0760,
  "lng": 72.8777,
  "rating": 4.6
}
```

**GET /therapists/{therapist_id}/profile** — view own profile

**POST /therapists/{therapist_id}/patients/{patient_id}** — link patient (consent)

**GET /therapists/{therapist_id}/patients** — patient list (triage view)
```json
[
  {
    "patient_id": "alice_123",
    "display_name": "Alice",
    "linked_at": "2026-09-18T10:00:00+00:00",
    "overall_severity": "moderate",
    "overall_decay_score": 0.62,
    "active_stressor_count": 2,
    "entry_count": 8
  }
]
```

**GET /therapists/{therapist_id}/patients/{patient_id}/report**
Full clinical report — expose this only on the therapist's screen, never the patient's.
```json
{
  "anonymous_id": "alice_123",
  "period": "last 14 days",
  "stressors": [
    {
      "category": "Work/Career",
      "trend": "escalating",
      "severity": "high",
      "entry_count": 5,
      "latest_score": 0.81,
      "current_decay_score": 0.77,
      "active_stressor_count": 2,
      "latest_reason": "manager threatened over missed deadline",
      "recent_triggers": [
        "manager threatened over missed deadline",
        "late delivery caused client complaint",
        "extra hours without notice"
      ]
    }
  ],
  "overall_severity": "high",
  "overall_decay_score": 0.73,
  "crisis_resources_shown": false
}
```

---

### Role-Based UI Rules

| What | Patient sees | Therapist sees |
|---|---|---|
| Wellness label | ✅ (plain English only) | ❌ |
| Raw stress scores | ❌ NEVER | ✅ (in full report) |
| Severity tiers (flagged/high/etc.) | ❌ NEVER | ✅ |
| Specific triggers/reasons | ❌ NEVER | ✅ |
| Therapist recommendations | ✅ | ❌ |
| Patient list (triage) | ❌ | ✅ |
| Full clinical report | ❌ | ✅ |

---

### Required API Keys

| Key | Where used | Required for? |
|---|---|---|
| `OPENAI_API_KEY` | Backend `.env` | Real Whisper transcription + GPT-4o-mini categorization. Without it, fallback keyword mode runs fine for demo. |
| `MODEL_API_URL` | Backend `.env` | Person A's stress classifier endpoint. Default: `http://localhost:8001/predict`. Set `USE_MOCK_MODEL=true` if Person A hasn't deployed yet. |

**No Google Maps, no SMS, no OAuth key needed for this demo.**

---

### Dev Quick-Start

```bash
# 1. Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# 2. Seed demo data (3 users with pre-filled entries)
python seed_demo_data.py

# 3. Try patient overview
curl http://localhost:8000/users/alice/overview

# 4. Open Swagger UI for all endpoints
http://localhost:8000/docs
```
