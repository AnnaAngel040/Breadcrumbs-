# Backend — Pipeline, Trend Tracking, Severity, Matching, Reporting

Implements the full "Person B" spec: audio → transcript → Person A's model →
DB → stressor threads → trends → severity tiers → therapist matching →
anonymized report.

## Setup

You already ran:
```bash
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn openai requests pydantic
```

Now drop these files into that `backend/` folder (this delivery *is* that
folder — `app/` package plus `requirements.txt`, `.env.example`, this
README), then:

```bash
pip install -r requirements.txt   # picks up python-dotenv, python-multipart too
cp .env.example .env
# edit .env: add your real OPENAI_API_KEY when you're ready to test real
# transcription, and MODEL_API_URL once Person A's endpoint is live.
```

## Running

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` for interactive Swagger UI — the fastest
way to poke every endpoint by hand.

## Development mode (no Whisper key, no Person A endpoint needed yet)

By default `.env.example` sets:
```
USE_MOCK_MODEL=true
```
and `main.py`/`pipeline.py` default `USE_MOCK_TRANSCRIPTION` to `true` as
well. This means you can build and demo the *entire* pipeline — threading,
trends, severity, matching, reporting — before either Whisper or Person A's
model is wired up for real. Flip each flag to `false` independently the
moment the real thing is ready; nothing else in the code changes.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/entries/text` | Submit `{user_id, transcript}` directly (fastest way to test without audio files) |
| POST | `/entries/audio` | Multipart upload: `user_id` field + `audio` file |
| GET | `/users/{user_id}/entries` | Raw stored entries |
| GET | `/users/{user_id}/threads` | Threads with per-thread trend + severity |
| GET | `/users/{user_id}/report` | Full anonymized report (Part 6) |
| GET | `/users/{user_id}/therapists/{category}` | Matched therapists for a category, respecting current overall severity |
| DELETE | `/users/{user_id}/entries` | Right-to-delete: permanently removes all data for a user (404 if none exists) |
| GET | `/admin/users` | Debug helper — lists all user_ids with data. Not for production without auth. |
| GET | `/health` | Liveness check |

## Quick manual test

```bash
# a few days of entries for one user
curl -X POST http://127.0.0.1:8000/entries/text \
  -H "Content-Type: application/json" \
  -d '{"user_id":"demo_user","transcript":"Work has been overwhelming, deadlines keep piling up."}'

curl http://127.0.0.1:8000/users/demo_user/report
```

## Where each part of the guide lives

- **Part 1 (pipeline)**: `transcription.py`, `model_client.py`, `pipeline.py`, `database.py`
- **Part 2 (topic linking)**: `threading_logic.py` — `get_stressor_threads()` is Step 1 (fixed taxonomy, free). `refine_threads_with_similarity()` is Step 2 — pass Person C's `is_same_stressor` function in as `similarity_fn` to `build_threads()` once it's ready. Until then, everything runs on category-only threading automatically — no code change needed elsewhere.
- **Part 3 (trend)**: `trends.py`
- **Part 4 (severity)**: `severity.py` + `risk_keywords.py`
- **Part 5 (matching)**: `matching.py` + `therapists.json`
- **Part 6 (report)**: `report.py`

## Integrating Person A's real model

1. Agree the exact JSON contract in writing (see the docstring at the top of `model_client.py`).
2. Set `MODEL_API_URL` in `.env` to their running endpoint.
3. Set `USE_MOCK_MODEL=false`.
4. If their field names don't match `{stress_score, category, confidence}`, fix it in exactly one place: `_normalize()` in `model_client.py`.

## Integrating Person C's similarity function

Their function should have the signature `is_same_stressor(text_a: str, text_b: str) -> float`.
Pass it into `build_threads(entries, similarity_fn=is_same_stressor)` — currently
called with `similarity_fn=None` in `main.py`'s `/threads` route and in
`report.py`'s default call. Swap those two call sites when it's ready. If it's
flaky or not ready by hour 12-13, leave `similarity_fn=None` — the app still
works correctly on category-only threads.

## Privacy / data retention

The guide flags the raw transcript field as something to "consider marking
for deletion/encryption post-processing." Two pieces implement that:

- `DELETE /users/{user_id}/entries` — a real right-to-delete endpoint. Irreversible, no soft-delete, on purpose.
- `run_retention_sweep.py` — run manually (or on a schedule) to redact transcript text older than N days while keeping category/score/date intact, so reports and trends stay computable from history without raw spoken content sitting in the DB indefinitely:
  ```
  python run_retention_sweep.py --days 30
  ```

## Tests

```
pytest test_logic.py -v
```
16 tests covering severity boundaries (including the exact `> 0.75` / `>= 3`
edge cases), trend classification, threading (both category-only and
similarity-refined), and therapist matching — including the empty-category
and similarity-suffix-stripping edge cases. These are pure logic tests, no
DB or server needed, so they run in milliseconds. Worth having open on a
second screen during judging as proof the thresholds behave as claimed.

## A note on `severity.py` / `risk_keywords.py`

Read the docstrings before changing thresholds or the keyword list. This is
the part of the app judges will press hardest on — it's built as an
explicit, inspectable, conservative routing heuristic (never a diagnostic
tool), and the code is written so you can walk a judge through every rule
line by line.
