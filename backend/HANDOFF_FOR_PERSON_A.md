# Handoff for Person A — ML Model Trainer

## Your Role in This Project

You train the **binary stress classifier** that sits at the heart of our pipeline.
Your model receives a transcribed diary entry (plain text) and returns two numbers:
- `stress_score` — float in [0.0, 1.0] — how stressed this entry sounds
- `confidence` — float in [0.0, 1.0] — how certain the model is

Person B (backend) calls your endpoint in every diary entry pipeline run.
Person C (frontend) never calls your model directly.

---

## API Contract — What You Must Expose

**Endpoint:** `POST /predict`
**Default URL:** `http://localhost:8001/predict`  (set `MODEL_API_URL` in `.env` to change)

### Request body (JSON)
```json
{ "text": "I have been so overwhelmed at work lately..." }
```

### Response body (JSON)
```json
{
  "stress_score": 0.82,
  "confidence": 0.91
}
```

### Hard rules
| Constraint | Value |
|---|---|
| `stress_score` type | float, range [0.0, 1.0] |
| `confidence` type | float, range [0.0, 1.0] |
| HTTP status on success | 200 |
| HTTP status on empty/bad text | 422 |
| Max latency acceptable | < 2 s per call |
| Extra fields in response | Allowed — backend ignores them |

### What happens if your endpoint is down
Backend reads `USE_MOCK_MODEL` env var.  If `true`, it uses a deterministic mock
that returns `{"stress_score": 0.5, "confidence": 0.9}`.  This keeps everything
runnable without your endpoint during development.

---

## What the Backend Does With Your Output

```
Your model output
      │
      ▼
stress_score ──────────────────────────────────────────► stored in SQLite entries table
      │
      ▼
Optional fusion with linguistic intensity (Person B, ENABLE_SENTIMENT_FUSION=true):
  fused_score = model_weight * stress_score + (1 - model_weight) * linguistic_score
  (model_weight defaults to 0.7, so your model always dominates)
      │
      ▼
Severity tier computed:
  flagged  → score ≥ 0.85  AND  trend == "escalating"  AND  3+ active stressors
  high     → score ≥ 0.70  AND  trend == "escalating"  AND  2+ active stressors
  moderate → score ≥ 0.50
  low      → everything else
  Crisis keywords override tier to "flagged" instantly (e.g. "want to die", "suicide")
      │
      ▼
Time-decay recency weighting:
  w_i = exp(-λ * Δt),  λ = ln(2) / half_life_days  (default half_life = 7 days)
  Entries from today have full weight; 7-day-old entries have half weight.
```

---

## Domain Shift Warning

Our app targets **workplace/student stress in Indian urban contexts**.
Your training data should ideally include:
- Statements about deadlines, managers, exams, financial pressure, family expectations
- Code-switched phrases (English-Hindi, e.g. "bahut zyada kaam hai")
- South Asian names and cultural references

If you use an open dataset (e.g. DAIC-WOZ, AVEC), please note it's from a
different demographic and the model may under-detect culturally-framed stress.
Consider fine-tuning on a small synthetic dataset for a few epochs.

---

## Validation Script

When your endpoint is running:

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"I am extremely stressed about my deadline\"}"
# Expected: stress_score > 0.6

curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Had a great relaxing day, feeling calm\"}"
# Expected: stress_score < 0.4
```

Or run the backend integration test:
```bash
USE_MOCK_MODEL=false MODEL_API_URL=http://localhost:8001 python -m pytest test_logic.py -v -k "not account and not overview"
```

---

## Required ENV Vars (set in backend .env)

```
MODEL_API_URL=http://localhost:8001/predict   # your endpoint
USE_MOCK_MODEL=false                          # set true during dev without your server
```

---

## Files You Should Know About (backend)

| File | What it does |
|---|---|
| `app/model_client.py` | Calls your endpoint; handles mock fallback |
| `app/pipeline.py` | Orchestrates transcription → your model → categorize → store |
| `app/sentiment_intensity.py` | Optional linguistic layer that fuses with your score |
| `.env.example` | All env vars with descriptions |
