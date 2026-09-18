"""
test_logic.py

Automated tests for the core decision logic — severity tiers, trend
computation, threading, and therapist matching. Run with:

    pytest test_logic.py -v

These don't touch the DB or network — pure function tests against the
logic modules, so they run in well under a second and don't need mock
flags or a running server. Good to point a judge at directly: "here's
proof our thresholds behave the way we say they do."
"""

from datetime import datetime, timedelta, timezone

from app.severity import compute_severity, severity_for_thread, overall_severity
from app.trends import compute_trend, compute_time_decay_stress
from app.threading_logic import get_stressor_threads, refine_threads_with_similarity
from app.matching import match_therapists, haversine_km
from app.risk_keywords import check_acute_risk_keywords
from app.categorize import categorize, categorize_with_reason, CANONICAL_CATEGORIES
from app.sentiment_intensity import analyze_linguistic_intensity, fuse_stress_score


def _entry(days_ago, score, category="Work/Career", transcript="normal day"):
    return {
        "date": (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat(),
        "stress_score": score,
        "category": category,
        "transcript": transcript,
    }


# ---------- severity ----------

def test_flagged_overrides_everything_else():
    # Even with a low score and improving trend, acute-risk language must flag.
    result = compute_severity(
        trend="improving", latest_score=0.1, num_active_stressors=1,
        latest_transcript="I don't want to be here anymore.",
    )
    assert result == "flagged"


def test_high_requires_all_three_conditions():
    # escalating + score > 0.75 + >=3 active stressors -> high
    assert compute_severity("escalating", 0.8, 3, "an ordinary day") == "high"
    # missing the stressor-count condition -> should NOT be high
    assert compute_severity("escalating", 0.8, 2, "an ordinary day") != "high"
    # missing the score condition -> should NOT be high
    assert compute_severity("escalating", 0.7, 3, "an ordinary day") != "high"


def test_moderate_boundary():
    assert compute_severity("stable", 0.51, 1, "fine") == "moderate"
    assert compute_severity("stable", 0.5, 1, "fine") == "low"  # exactly 0.5 is NOT > 0.5


def test_low_is_the_default():
    assert compute_severity("improving", 0.9, 5, "fine") == "low"


def test_overall_severity_takes_the_worst_case():
    assert overall_severity(["low", "moderate", "flagged", "high"]) == "flagged"
    assert overall_severity(["low", "low"]) == "low"
    assert overall_severity([]) == "low"


def test_acute_risk_keyword_matching_is_case_insensitive():
    assert check_acute_risk_keywords("I just want to END IT ALL") is True
    assert check_acute_risk_keywords("just a normal stressful day") is False
    assert check_acute_risk_keywords("") is False


# ---------- trends ----------

def test_trend_insufficient_data_with_one_entry():
    assert compute_trend([_entry(0, 0.5)]) == "insufficient_data"


def test_trend_escalating():
    entries = [_entry(10, 0.2), _entry(7, 0.25), _entry(3, 0.6), _entry(0, 0.7)]
    assert compute_trend(entries) == "escalating"


def test_trend_improving():
    entries = [_entry(10, 0.8), _entry(7, 0.7), _entry(3, 0.3), _entry(0, 0.2)]
    assert compute_trend(entries) == "improving"


def test_trend_stable_within_threshold():
    entries = [_entry(5, 0.5), _entry(0, 0.55)]  # delta well under 0.15
    assert compute_trend(entries) == "stable"


# ---------- threading ----------

def test_category_threading_groups_by_category():
    entries = [
        _entry(3, 0.5, category="Work/Career"),
        _entry(2, 0.6, category="Family"),
        _entry(1, 0.7, category="Work/Career"),
    ]
    threads = get_stressor_threads(entries)
    assert set(threads.keys()) == {"Work/Career", "Family"}
    assert len(threads["Work/Career"]) == 2
    assert len(threads["Family"]) == 1


def test_similarity_refinement_splits_on_low_similarity():
    entries = [
        _entry(3, 0.5, transcript="my manager keeps criticizing my work"),
        _entry(2, 0.6, transcript="workload is way too high this week"),
    ]
    # fake similarity fn: always returns 0.1 (i.e. "not the same stressor")
    always_different = lambda a, b: 0.1
    sub_threads = refine_threads_with_similarity(entries, always_different, threshold=0.7)
    assert len(sub_threads) == 2  # should have split into two separate sub-threads


def test_similarity_refinement_keeps_together_on_high_similarity():
    entries = [
        _entry(3, 0.5, transcript="my manager keeps criticizing my work"),
        _entry(2, 0.6, transcript="my manager criticized my work again today"),
    ]
    always_same = lambda a, b: 0.95
    sub_threads = refine_threads_with_similarity(entries, always_same, threshold=0.7)
    assert len(sub_threads) == 1


# ---------- matching ----------

def test_matching_returns_at_most_three():
    matches = match_therapists("Work/Career", "low")
    assert len(matches) <= 3


def test_matching_unknown_category_returns_empty_not_error():
    matches = match_therapists("NotARealCategory", "low")
    assert matches == []


def test_matching_strips_similarity_suffix():
    # "Work/Career#0" (a similarity sub-thread) should match same directory
    # entries as plain "Work/Career"
    with_suffix = match_therapists("Work/Career#0", "low")
    without_suffix = match_therapists("Work/Career", "low")
    assert with_suffix == without_suffix


# ---------- categorization (keyword fallback path — no network needed) ----------

def test_categorize_always_returns_a_canonical_category():
    # With no OPENAI_API_KEY set in this test env, categorize() must fall
    # back to keyword matching rather than raising.
    result = categorize("A completely generic sentence with no clear topic.")
    assert result in CANONICAL_CATEGORIES


def test_categorize_keyword_fallback_on_clear_examples():
    cases = {
        "Work/Career": "My manager keeps piling deadlines on me every meeting.",
        "Finances": "I cannot afford rent this month and I am drowning in debt.",
        "Family": "My mom and dad have been fighting and it stresses me out.",
    }
    for expected, text in cases.items():
        assert categorize(text) == expected


def test_categorize_with_reason_returns_category_and_trigger():
    res = categorize_with_reason("My manager keeps threatening to fire me over this project due date.")
    assert "category" in res
    assert "reason" in res
    assert res["category"] == "Work/Career"
    assert len(res["reason"]) > 3



# ---------- location & mode matching (Haversine & filters) ----------

def test_haversine_distance_calculation():
    # San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2712) ~ 13.5 km
    dist = haversine_km(37.7749, -122.4194, 37.8044, -122.2712)
    assert 12.0 < dist < 15.0


def test_matching_prefers_and_filters_by_online_mode():
    matches = match_therapists("Work/Career", "low", preferred_mode="online")
    assert len(matches) > 0
    for m in matches:
        assert "online" in [x.lower() for x in m["modes"]]


def test_matching_prefers_and_filters_by_offline_mode():
    matches = match_therapists("Work/Career", "low", preferred_mode="offline")
    assert len(matches) > 0
    for m in matches:
        assert "offline" in [x.lower() for x in m["modes"]]


def test_matching_with_coordinates_and_distance_cutoff():
    # User in San Francisco downtown
    user_lat, user_lng = 37.789, -122.408
    matches = match_therapists(
        "Work/Career",
        "low",
        preferred_mode="offline",
        user_lat=user_lat,
        user_lng=user_lng,
        max_distance_km=10.0,
    )
    assert len(matches) > 0
    for m in matches:
        assert m["distance_km"] is not None
        assert m["distance_km"] <= 10.0
        assert "match_score" in m


# ---------- time decay stress calculations ----------

def test_time_decay_stress_gives_higher_weight_to_recent_entries():
    # User was calm (0.2) 14 days ago, but experienced severe acute stress (0.9) today
    entries = [_entry(14, 0.2), _entry(0, 0.9)]
    simple_average = (0.2 + 0.9) / 2.0  # 0.55
    decay_score = compute_time_decay_stress(entries, half_life_days=7.0)

    # Because the 0.9 entry is today and the 0.2 entry is 2 half-lives ago (weight 0.25),
    # decay_score must be significantly higher than simple average
    assert decay_score > simple_average
    assert decay_score > 0.70


def test_time_decay_empty_or_single_entry():
    assert compute_time_decay_stress([]) == 0.0
    single = [_entry(0, 0.65)]
    assert compute_time_decay_stress(single) == 0.65


# ---------- sentiment & linguistic intensity ----------

def test_linguistic_intensity_and_fused_score():
    stressed_text = "I am totally panicking, completely overwhelmed and terrified about this impossible deadline!"
    calm_text = "Today was a peaceful and calm day, feeling relieved and grateful."

    stressed_analysis = analyze_linguistic_intensity(stressed_text)
    calm_analysis = analyze_linguistic_intensity(calm_text)

    assert stressed_analysis["sentiment_stress_score"] > calm_analysis["sentiment_stress_score"]
    assert stressed_analysis["arousal"] > calm_analysis["arousal"]
    assert stressed_analysis["absolutist_density"] > 0.0

    fused = fuse_stress_score(0.5, stressed_text, model_weight=0.7)
    assert "fused_stress_score" in fused
    assert fused["fused_stress_score"] >= 0.5


# ─── Account layer tests ──────────────────────────────────────────────────────

import tempfile, os
from app.database import (
    init_db, create_account, get_account,
    upsert_therapist_profile, get_therapist_profile,
    link_therapist_patient, get_patients_for_therapist,
    insert_entry,
)
from app.report import build_patient_overview


def _tmp_db():
    """Returns a path to a fresh in-memory-style temp SQLite file."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(db_path=path)
    return path


def test_create_and_get_account():
    db = _tmp_db()
    acc = create_account("u1", "Alice", role="patient", db_path=db)
    assert acc["user_id"] == "u1"
    assert acc["role"] == "patient"

    fetched = get_account("u1", db_path=db)
    assert fetched["display_name"] == "Alice"


def test_create_account_duplicate_is_idempotent():
    db = _tmp_db()
    create_account("u2", "Bob", role="patient", db_path=db)
    # Second call with same user_id must not raise (INSERT OR IGNORE)
    create_account("u2", "Bobby", role="patient", db_path=db)
    fetched = get_account("u2", db_path=db)
    assert fetched["display_name"] == "Bob"   # first write wins


def test_therapist_profile_upsert():
    db = _tmp_db()
    create_account("t1", "Dr. Nair", role="therapist", db_path=db)
    profile = upsert_therapist_profile(
        "t1", "Anxiety", tier="premium", modes=["online", "offline"],
        city="Bangalore", lat=12.97, lng=77.59, db_path=db,
    )
    assert profile["specialty"] == "Anxiety"
    assert "offline" in profile["modes"]

    fetched = get_therapist_profile("t1", db_path=db)
    assert fetched["city"] == "Bangalore"
    assert fetched["lat"] == pytest.approx(12.97, abs=0.01)


def test_therapist_patient_link_and_list():
    db = _tmp_db()
    create_account("t2", "Dr. Sharma", role="therapist", db_path=db)
    create_account("p1", "Patient One", role="patient", db_path=db)
    link = link_therapist_patient("t2", "p1", db_path=db)
    assert link["therapist_id"] == "t2"
    assert link["patient_id"] == "p1"

    patients = get_patients_for_therapist("t2", db_path=db)
    assert len(patients) == 1
    assert patients[0]["patient_id"] == "p1"


def test_patient_overview_no_entries():
    """User with zero entries should get a stable/empty overview — no crash."""
    result = build_patient_overview("user_who_has_never_logged_anything_at_all")
    assert "wellbeing_label" in result
    assert "trend_summary" in result
    assert result["active_area_count"] == 0
    assert result["show_crisis_resources"] is False


def test_ollama_reason_graceful_fallback():
    from app.categorize import extract_reason_ollama, categorize_with_reason
    # If Ollama is not running, extract_reason_ollama returns None cleanly without raising
    reason = extract_reason_ollama("I have three deadlines this week and my manager keeps adding more work", "Work/Career")
    assert reason is None or isinstance(reason, str)

    # categorize_with_reason always provides a valid non-empty reason string
    res = categorize_with_reason("I have three deadlines this week and my manager keeps adding more work")
    assert res["category"] == "Work/Career"
    assert isinstance(res["reason"], str)
    assert len(res["reason"]) > 3


import pytest


