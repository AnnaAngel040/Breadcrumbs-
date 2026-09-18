"""
trends.py  (Part 3 of the guide: Trend Computation)

Deliberately simple early-vs-late average comparison rather than a fitted
regression — interpretable, easy to defend to a judge, and sufficient to
demonstrate the trend-tracking concept in a 28-hour build.
"""

import math
from datetime import datetime, timezone
from typing import Optional

ESCALATING_THRESHOLD = 0.15
IMPROVING_THRESHOLD = -0.15


def compute_trend(thread_entries: list[dict]) -> str:
    """thread_entries: list of entry dicts, any order (we sort internally).
    Returns one of: "insufficient_data", "escalating", "improving", "stable".
    """
    if len(thread_entries) < 2:
        return "insufficient_data"

    sorted_entries = sorted(thread_entries, key=lambda e: e["date"])
    scores = [e["stress_score"] for e in sorted_entries]

    midpoint = len(scores) // 2
    early = scores[:midpoint or 1]
    late = scores[midpoint:]

    early_avg = sum(early) / len(early)
    late_avg = sum(late) / len(late)
    delta = late_avg - early_avg

    if delta > ESCALATING_THRESHOLD:
        return "escalating"
    elif delta < IMPROVING_THRESHOLD:
        return "improving"
    else:
        return "stable"


def compute_trend_slope(thread_entries: list[dict]) -> float:
    """Optional upgrade path mentioned in the guide: a simple linear
    regression slope over (index, stress_score) pairs, using only stdlib
    math (no numpy dependency needed for a hackathon). Only reach for this
    if the early-vs-late comparison above isn't nuanced enough and you have
    spare time — don't chase it at the expense of the rest of the pipeline.
    """
    if len(thread_entries) < 2:
        return 0.0

    sorted_entries = sorted(thread_entries, key=lambda e: e["date"])
    ys = [e["stress_score"] for e in sorted_entries]
    xs = list(range(len(ys)))
    n = len(xs)

    x_mean = sum(xs) / n
    y_mean = sum(ys) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    denominator = sum((x - x_mean) ** 2 for x in xs)

    return numerator / denominator if denominator else 0.0


def compute_time_decay_stress(
    thread_entries: list[dict],
    half_life_days: float = 7.0,
    reference_time: Optional[datetime] = None,
) -> float:
    """Computes an exponential time-decayed weighted average of stress scores.

    Formula:
        lambda = ln(2) / half_life_days
        w_i = exp(-lambda * delta_days_i)
        S_decay = sum(w_i * S_i) / sum(w_i)

    An entry logged today has weight 1.0; an entry logged `half_life_days` ago
    carries weight 0.5; an entry logged 2 * half_life_days ago carries weight 0.25.
    This provides a continuous, recency-sensitive estimate of active stress state.
    """
    if not thread_entries:
        return 0.0

    ref = reference_time or datetime.now(timezone.utc)
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)

    decay_lambda = math.log(2.0) / max(0.1, half_life_days)
    weighted_sum = 0.0
    total_weights = 0.0

    for e in thread_entries:
        raw_date = e.get("date", "")
        try:
            dt = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = ref

        elapsed_days = max(0.0, (ref - dt).total_seconds() / 86400.0)
        weight = math.exp(-decay_lambda * elapsed_days)
        score = float(e.get("stress_score", 0.0))

        weighted_sum += weight * score
        total_weights += weight

    if total_weights <= 0.0:
        return round(float(thread_entries[-1].get("stress_score", 0.0)), 3)

    return round(weighted_sum / total_weights, 3)

