# Backend API — Handoff for Frontend

Base URL (local dev): `http://127.0.0.1:8000`
Interactive docs: `http://127.0.0.1:8000/docs` — try every call by hand here first.

Backend is live right now on mock data (no real model or Whisper key needed
yet), so you can build against it immediately.

## Fastest way to get data flowing while you build

Use `POST /entries/text` instead of the audio endpoint during development —
same response shape, no need to record/upload real audio while you're
wiring up UI:

```
POST /entries/text
Content-Type: application/json

{"user_id": "demo1", "transcript": "Work has been really overwhelming lately."}
```

Or just run `python seed_demo_data.py` from the backend folder — it inserts
three ready-made demo users you can point the UI at immediately:

| user_id | what it demos |
|---|---|
| `demo_escalating` | multi-week worsening trend, ends at severity `"high"` |
| `demo_improving` | trend easing off, stays at `"low"` |
| `demo_flagged` | crisis-keyword path — `overall_severity: "flagged"`, `crisis_resources_shown: true` |

## Endpoints you'll actually call

### Submit an entry
```
POST /entries/audio       multipart: user_id (text field) + audio (file)
POST /entries/text        json: {user_id, transcript}
```
Both return the same shape:
```json
{
  "entry_id": "uuid",
  "user_id": "demo1",
  "date": "2026-09-18T04:32:00+00:00",
  "transcript": "...",
  "category": "Work/Career",
  "stress_score": 0.71,
  "confidence": 0.85,
  "similarity_group_id": null
}
```

### Get threads (for a trend view per stressor)
```
GET /users/{user_id}/threads
```
```json
[
  {
    "category": "Work/Career",
    "trend": "escalating",        // "escalating" | "stable" | "improving" | "insufficient_data"
    "severity": "high",           // "low" | "moderate" | "high" | "flagged"
    "entry_count": 5,
    "latest_score": 0.83,
    "active_stressor_count": 3
  }
]
```

### Get the full report (main dashboard view)
```
GET /users/{user_id}/report
```
```json
{
  "anonymous_id": "demo1",
  "period": "last 14 days",
  "stressors": [ /* same shape as threads above */ ],
  "overall_severity": "high",
  "crisis_resources_shown": false
}
```

**UI requirement, not optional:** whenever `crisis_resources_shown` is
`true`, the frontend must surface crisis-line resources immediately and
prominently — in addition to any therapist-booking UI, never instead of it.
This should not depend on the user scrolling or clicking into anything.

### Get matched therapists
```
GET /users/{user_id}/therapists/{category}
```
`category` should be one of the 8 taxonomy categories (exact string match —
confirm final spelling with Person A/B once locked). Returns up to 3:
```json
[
  {"name": "Dr. Sofia Marín", "specialty": "Family", "tier": "standard"}
]
```

## Things worth building UI for now, even before the real model is live

- A per-category trend view (line/sparkline of `stress_score` over time) — data is already there via `/threads`
- A severity-aware banner: different treatment for `low` / `moderate` / `high` / `flagged`
- The crisis-resources surface for `flagged` — this is a judged, ethically-central part of the app, worth getting the UI polish right early rather than bolting on late
- Therapist match cards driven by `/users/{user_id}/therapists/{category}`

## What will change later (don't hardcode around these)

- Category strings may shift slightly once Person A's real taxonomy is locked — don't hardcode a category list in the frontend; always render whatever `category` string the API returns.
- `similarity_group_id` may start appearing on entries once Person C's similarity model is integrated (hour 9-10) — thread `category` keys may also start looking like `"Work/Career#0"` / `"Work/Career#1"` at that point if a category gets split into sub-threads. Frontend should treat these as opaque thread identifiers, not assume category is always a clean top-level name.
