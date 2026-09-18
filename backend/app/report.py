"""
report.py  (Part 6 of the guide: Anonymized Report Generation)

Produces structured summary data only — category, trend, severity, counts.
Never includes the raw transcript, consistent with the privacy design.
Real identity is attached only if the user separately opts in at booking;
this layer only ever deals with the anonymous/pseudonymous user_id already
stored in the entries table.
"""

from typing import Callable, Optional

from app.database import get_entries_for_user
from app.threading_logic import build_threads
from app.trends import compute_trend, compute_time_decay_stress
from app.severity import severity_for_thread, overall_severity


def build_report(
    user_id: str,
    period_label: str = "last 14 days",
    similarity_fn: Optional[Callable[[str, str], float]] = None,
) -> dict:
    entries = get_entries_for_user(user_id)

    if not entries:
        return {
            "anonymous_id": user_id,
            "period": period_label,
            "stressors": [],
            "overall_severity": "low",
            "overall_decay_score": 0.0,
            "crisis_resources_shown": False,
        }

    threads = build_threads(entries, similarity_fn=similarity_fn)
    num_active_stressors = len(threads)  # across all categories, per the guide

    stressor_summaries = []
    severities = []

    for category, thread_entries in threads.items():
        trend = compute_trend(thread_entries)
        severity = severity_for_thread(thread_entries, trend, num_active_stressors)
        sorted_thread = sorted(thread_entries, key=lambda e: e["date"])
        latest_entry = sorted_thread[-1]
        latest_score = latest_entry["stress_score"]
        latest_reason = latest_entry.get("reason")
        current_decay_score = compute_time_decay_stress(thread_entries)

        recent_triggers = []
        for e in reversed(sorted_thread):
            r = e.get("reason")
            if r and r not in recent_triggers:
                recent_triggers.append(r)
            if len(recent_triggers) >= 3:
                break

        stressor_summaries.append({
            "category": category,
            "trend": trend,
            "severity": severity,
            "entry_count": len(thread_entries),
            "latest_score": latest_score,
            "current_decay_score": current_decay_score,
            "active_stressor_count": num_active_stressors,
            "latest_reason": latest_reason,
            "recent_triggers": recent_triggers,
        })
        severities.append(severity)

    final_severity = overall_severity(severities)
    overall_decay_score = compute_time_decay_stress(entries)

    return {
        "anonymous_id": user_id,
        "period": period_label,
        "stressors": stressor_summaries,
        "overall_severity": final_severity,
        "overall_decay_score": overall_decay_score,
        # "flagged" always means crisis resources must be shown in the UI,
        # in addition to any professional-booking suggestion — not instead of it.
        "crisis_resources_shown": final_severity == "flagged",
    }


def build_patient_overview(user_id: str) -> dict:
    """Generates a gentle, non-clinical wellness summary for the patient's own view.

    Patients must never see raw stress scores, severity labels, or clinical language.
    This function converts the clinical report into plain human language:
      - 'You seem stressed today' instead of 'severity: high'
      - 'Things look steady' instead of 'trend: stable'
    """
    full = build_report(user_id)
    severity = full["overall_severity"]
    stressors = full["stressors"]
    crisis = full["crisis_resources_shown"]

    entry_count = sum(s["entry_count"] for s in stressors)
    active_area_count = len(stressors)
    primary_area = stressors[0]["category"] if stressors else None

    # Determine the primary trend across all active threads
    trend_votes = [s["trend"] for s in stressors if s["trend"] != "insufficient_data"]
    if not trend_votes:
        dominant_trend = "insufficient_data"
    elif trend_votes.count("escalating") >= len(trend_votes) / 2:
        dominant_trend = "escalating"
    elif trend_votes.count("improving") > trend_votes.count("stable"):
        dominant_trend = "improving"
    else:
        dominant_trend = "stable"

    # Human-readable wellness label (no clinical terms)
    _label_map = {
        "flagged":  "We're concerned about you — please reach out for help",
        "high":     "You seem to be going through a lot right now",
        "moderate": "You seem stressed today",
        "low":      "Things look manageable today",
    }
    wellbeing_label = _label_map.get(severity, "Things look manageable today")

    # Trend summary in plain language
    _trend_map = {
        "escalating":        "Stress has been building over the past week",
        "improving":         "Things have been getting a little easier recently",
        "stable":            "Your stress levels have been fairly steady",
        "insufficient_data": "Not enough diary entries yet to see a pattern",
    }
    trend_summary = _trend_map.get(dominant_trend, "Not enough data yet")

    return {
        "user_id": user_id,
        "wellbeing_label": wellbeing_label,
        "active_area_count": active_area_count,
        "primary_area": primary_area,
        "trend_summary": trend_summary,
        "show_crisis_resources": crisis,
        "entry_count_last_14_days": entry_count,
    }
