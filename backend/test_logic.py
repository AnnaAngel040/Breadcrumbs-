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
from app.trends import compute_trend
from app.threading_logic import get_stressor_threads, refine_threads_with_similarity
from app.matching import match_therapists
from app.risk_keywords import check_acute_risk_keywords


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
