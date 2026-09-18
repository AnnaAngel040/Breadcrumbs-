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

