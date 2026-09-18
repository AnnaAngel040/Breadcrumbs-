# Backend API — Handoff for Person C (Frontend & NLP Specialist)

Base URL (local dev): `http://127.0.0.1:8000`  
Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

---

## 1. Fast Development: Mock Mode & Seed Demo Data

The backend runs out-of-the-box with zero external dependencies (mock transcription and mock stress model active by default).

To populate realistic demo data across all three clinical states, run:
```bash
python seed_demo_data.py
```
This seeds three test users:
| User ID | Clinical State | Expected Frontend Presentation |
| :--- | :--- | :--- |
| `demo_escalating` | Multi-week worsening stress | High severity banner, escalating trajectory |
| `demo_improving` | Recovery trend | Low severity badge, downward stress curve |
| `demo_flagged` | Acute crisis keywords | **Immediate mandatory Crisis Hotlines modal** |

---

## 2. Endpoints You Will Call

### 1. Submit an Audio or Text Diary Entry
```http
POST /entries/audio    (multipart/form-data: user_id [text], audio [file])
POST /entries/text     (application/json: {"user_id": "u123", "transcript": "text"})
```
**Response (`EntryOut`)**:
```json
{
  "entry_id": "c71a3617-640a-42c2-bfa1-e5d0d8858348",
  "user_id": "u123",
  "date": "2026-09-18T06:20:00+00:00",
  "transcript": "Work deadlines are piling up and I feel overwhelmed.",
  "category": "Work/Career",
  "stress_score": 0.78,
  "confidence": 0.89,
  "similarity_group_id": null
}
```

---

### 2. Get Threads (For Stressor Cards & Trend Sparklines)
```http
GET /users/{user_id}/threads
```
**Response (`list[ThreadOut]`)**:
```json
[
  {
    "category": "Work/Career",
    "trend": "escalating",
    "severity": "high",
    "entry_count": 8,
    "latest_score": 0.83,
    "current_decay_score": 0.724,
    "active_stressor_count": 3,
    "latest_reason": "manager assigning unmanageable workload",
    "recent_triggers": [
      "manager assigning unmanageable workload",
      "emergency weekend shift"
    ]
  }
]
```
- `latest_score`: Most recent single diary check-in score ($0.0 - 1.0$).
- `current_decay_score`: **Smoothed, time-decayed stress level** (7-day half-life exponential moving average). Use this for smoothed gauge meters!
- `latest_reason`: Specific triggering detail extracted from the latest entry (e.g. `"manager assigning unmanageable workload"`).
- `recent_triggers`: Up to 3 unique recent specific triggers causing distress in this category.
- `trend`: `"escalating"`, `"improving"`, `"stable"`, or `"insufficient_data"`.

---

### 3. Get Full Anonymized Clinical Report (Main Dashboard View)
```http
GET /users/{user_id}/report?period=last%2014%20days
```
**Response (`ReportOut`)**:
```json
{
  "anonymous_id": "u123",
  "period": "last 14 days",
  "stressors": [ ... ],
  "overall_severity": "high",
  "overall_decay_score": 0.685,
  "crisis_resources_shown": false
}
```

> ⚠️ **MANDATORY UI REQUIREMENT**:  
> Whenever `crisis_resources_shown` is `true` (triggered when `overall_severity == "flagged"`), the UI **must display crisis line resources immediately and prominently** (e.g., 988 Suicide & Crisis Lifeline, Crisis Text Line). It must not require user scrolling or clicking into sub-menus.

---

### 4. Get Matched Therapists (Location & Mode Aware)
```http
GET /users/{user_id}/therapists/{category}?preferred_mode=offline&lat=37.789&lng=-122.408&max_distance_km=25
```

#### Query Parameters:
- `category`: Base category name (e.g. `Work/Career`, `Academics`, `Family`, `Finances`, etc.).
- `preferred_mode` (optional): `"any"` (default), `"online"`, or `"offline"`.
- `lat`, `lng` (optional): User coordinates (from browser navigator geolocation).
- `max_distance_km` (optional): Maximum travel radius for offline visits (default: `50.0`).

**Response (`list[TherapistOut]`)**:
```json
[
  {
    "id": "th_01",
    "name": "Dr. Amara Chen",
    "specialty": "Work/Career",
    "tier": "standard",
    "modes": ["online", "offline"],
    "address": "450 Sutter St, San Francisco, CA 94108",
    "city": "San Francisco",
    "lat": 37.7895,
    "lng": -122.4082,
    "rating": 4.9,
    "distance_km": 1.07,
    "match_score": 1.738
  }
]
```
- `distance_km`: Geodesic distance computed via the Haversine formula (null for telehealth-only).
- `match_score`: Composite ranking score incorporating specialty, tier suitability, mode match, proximity, and clinician rating.

---

## 3. Integrating Person C's Semantic Similarity Function

Person B's threading engine supports semantic clustering to split broad categories into fine-grained sub-issues (e.g. separating `"organic chemistry midterm"` from `"thesis proposal"` within `Academics`).

### Your Required Function Signature:
```python
def is_same_stressor(text_a: str, text_b: str) -> float:
    """Takes two diary transcripts and returns cosine similarity in [0.0, 1.0].
    Threshold >= 0.70 groups entries into the same sub-thread.
    """
    ...
```

### Where to Plug It In:
Deliver this function in a Python module (or provide an endpoint). Person B has hook points already built and tested:
1. `app/main.py`: In `list_threads(user_id)` $\rightarrow$ `build_threads(entries, similarity_fn=is_same_stressor)`
2. `app/report.py`: In `build_report(user_id)` $\rightarrow$ `build_threads(entries, similarity_fn=is_same_stressor)`
