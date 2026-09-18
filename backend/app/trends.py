"""
trends.py  (Part 3 of the guide: Trend Computation)

Deliberately simple early-vs-late average comparison rather than a fitted
regression — interpretable, easy to defend to a judge, and sufficient to
demonstrate the trend-tracking concept in a 28-hour build.
"""

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
