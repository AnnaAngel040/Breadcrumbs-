"""
severity.py  (Part 4 of the guide: Severity Tiers / Triage Logic)

This is the most ethically sensitive part of the app. It is NOT a
suicide/crisis detector — it's a conservative, explicit, rule-based
support-routing heuristic that always errs toward showing help.
Every threshold is a deliberate, explainable judgment call, not a
black-box output. See the guide's Judge Q&A section for how to talk
about this out loud.
"""

from app.risk_keywords import check_acute_risk_keywords

HIGH_SCORE_THRESHOLD = 0.75
HIGH_MIN_ACTIVE_STRESSORS = 3
MODERATE_SCORE_THRESHOLD = 0.5

SEVERITY_ORDER = ["low", "moderate", "high", "flagged"]


def compute_severity(
    trend: str,
    latest_score: float,
    num_active_stressors: int,
    latest_transcript: str,
) -> str:
    """Returns one of: "flagged", "high", "moderate", "low".

    "flagged" always wins regardless of anything else — if acute-risk
    language is present, crisis resources must be shown immediately, in
    addition to (not instead of) any professional-booking suggestion.
    """
    if check_acute_risk_keywords(latest_transcript):
        return "flagged"

    if trend == "escalating" and latest_score > HIGH_SCORE_THRESHOLD and num_active_stressors >= HIGH_MIN_ACTIVE_STRESSORS:
        return "high"

    if trend in ("escalating", "stable") and latest_score > MODERATE_SCORE_THRESHOLD:
        return "moderate"

    return "low"


def severity_for_thread(thread_entries: list[dict], trend: str, num_active_stressors: int) -> str:
    """Convenience wrapper that pulls the latest entry's score/transcript
    out of a thread's entry list (already sorted or not — we sort here)."""
    if not thread_entries:
        return "low"
    latest = sorted(thread_entries, key=lambda e: e["date"])[-1]
    return compute_severity(
        trend=trend,
        latest_score=latest["stress_score"],
        num_active_stressors=num_active_stressors,
        latest_transcript=latest["transcript"],
    )


def overall_severity(severities: list[str]) -> str:
    """Worst-case across all threads for a user, using SEVERITY_ORDER as
    the ranking. Empty input defaults to "low" (nothing to report yet)."""
    if not severities:
        return "low"
    return max(severities, key=lambda s: SEVERITY_ORDER.index(s))
