# Backend — Project Status

_As of this build. Update as things land._

## ✅ Done

**Core pipeline (Part 1)**
- SQLite `entries` table + all DB access functions
- Whisper transcription wrapper (real + mock mode)
- Model-client wrapper for Person A's endpoint (real + mock mode)
- End-to-end wiring: audio/text in → transcript → prediction → stored entry
- Confirmed working: real FastAPI server boots, all routes respond correctly, tested with live curl/Swagger calls

**Topic linking (Part 2)**
- Fixed-taxonomy (category) threading — done, tested
- Similarity-refinement hook built and ready (`build_threads(..., similarity_fn=...)`) — falls back cleanly to category-only threading when `similarity_fn=None`, so nothing breaks if Person C's function isn't ready in time

**Trend computation (Part 3)**
- Early-vs-late average comparison — done, tested
- Optional regression-slope upgrade function included but not wired in (per the guide, only reach for it if there's spare time)

**Severity tiers (Part 4)**
- Full rule-based tiering: `flagged` → `high` → `moderate` → `low`
- Crisis-keyword check integrated and confirmed to force `flagged` regardless of score/trend
- Verified `crisis_resources_shown: true` propagates correctly into the report

**Therapist matching (Part 5)**
- Static directory (14 therapists across 8 categories) + matching logic — done, tested

**Report generation (Part 6)**
- Structured, transcript-free anonymized report — done, tested

**Infra / dev experience**
- Full FastAPI app with 6 working endpoints + `/docs` Swagger UI
- Mock-mode flags (`USE_MOCK_MODEL`, `USE_MOCK_TRANSCRIPTION`) so the whole thing runs with zero external dependencies
- Local environment fully debugged and confirmed working (Windows/PowerShell, Python 3.12 venv, all deps installed)
- Seed script for realistic demo data — verified all three demo users hit their intended severity/trend outcomes exactly
- README covering setup, endpoints, and where each spec section lives in code
- Frontend handoff doc for Person C, covering every endpoint shape and one explicit UI requirement (crisis resources must always surface on `flagged`)

## 🔲 Still to be done (blocked on other people)

- **Lock the JSON contract with Person A** — message is drafted (see chat history above), needs to actually be sent and confirmed. This determines whether `model_client.py`'s `_normalize()` needs edits.
- **Get Person A's real 8-category taxonomy names** — the current `CATEGORIES` list in `model_client.py` and every category in `therapists.json` are placeholders. If A's real categories differ, therapist matching will silently return empty lists until these are aligned.
- **Integrate Person C's `is_same_stressor(text_a, text_b) -> float`** — hook is ready and tested with a stub, just needs their real function passed in at two call sites (`main.py`'s `/threads` route, `report.py`'s default call). Scheduled for hour 9-10 per the original plan; not a blocker until then.
- **Swap `USE_MOCK_MODEL` → false** once A's endpoint is live and the contract is confirmed.
- **Swap `USE_MOCK_TRANSCRIPTION` → false** whenever you're ready to test with a real OpenAI key and real audio.

## 🔲 Still to be done (in your control, not blocked)

- Integration testing once both real dependencies (A's model, real Whisper) are swapped in — the guide budgets hour 18-20 for this.
- Decide whether the report is rendered as PDF/HTML for the demo, or shown as-is via the frontend — guide leaves this as a judgment call between you and Person C.
- Optional: try the regression-slope trend upgrade if there's spare time near the end (`trends.py::compute_trend_slope`, not wired in).

## ✅ Also done (added after initial build, while waiting on A/C)

- **Privacy/retention layer** — `DELETE /users/{user_id}/entries` (right-to-delete, tested, confirmed 404s on re-delete) and `run_retention_sweep.py` (redacts old transcripts, keeps scores/trends computable — tested, confirmed it redacts old rows and leaves recent ones untouched). This directly implements the guide's "consider marking transcript for deletion" note, which the original build had flagged but not built.
- **Automated test suite** (`test_logic.py`, 16 tests, all passing) — covers severity boundary conditions exactly (`> 0.75` and `>= 3` edge cases, `flagged` overriding everything, the `0.5` boundary for moderate), trend classification, both threading modes, and matching edge cases (unknown category, similarity-suffix stripping). Pure logic tests, no server/DB needed, runs in ~0.02s.
- **Input validation** — empty transcripts now rejected with a proper 422 instead of silently creating junk entries.
- **`GET /admin/users`** debug endpoint — lists every user_id with data, useful for sanity-checking demo state without opening a DB browser.

## What needs to be ready/true before the remaining items can happen

- Person A's endpoint must be actually deployed and reachable (even `localhost` is fine) before the contract can be tested for real, not just agreed on paper.
- Person A's category taxonomy must be finalized — matching logic and `therapists.json` both depend on exact string matches.
- Person C's similarity function must return a plain float in `[0, 1]` given two strings — any other signature needs a small adapter written before it can be passed into `build_threads()`.
- A real OpenAI API key (with Whisper access) is needed before real transcription can be tested — currently untested against a live key in this environment.
- No infrastructure blockers remain on your end: environment is fully working, dependencies installed, server confirmed running.

## Bottom line

The entire backend logic layer — pipeline, threading, trends, severity,
matching, reporting — is built, tested, and running locally right now on
mock data. Nothing left on your side is blocking a demo. Everything
remaining is either (a) waiting on Person A's real endpoint/taxonomy,
(b) waiting on Person C's similarity function, or (c) polish/rehearsal
items with no hard dependency.
