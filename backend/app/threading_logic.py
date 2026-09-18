"""
threading_logic.py  (Part 2 of the guide: Cross-Day Topic Linking)

Step 1 — fixed-taxonomy linking: entries sharing a category are treated as
the same stressor thread by default. Free, simple, always available.

Step 2 — similarity refinement: optionally split a broad category into
finer sub-threads using Person C's sentence-embedding similarity function.
This is a nice-to-have precision layer, not a dependency — if it's not
ready or reliable by hour 12-13, everything downstream (trends, severity,
matching, report) still works fine on category-only threads.
"""

from collections import defaultdict
from typing import Callable, Optional, Any


def _evaluate_similarity(
    similarity_fn: Callable[[str, str], Any],
    text_a: str,
    text_b: str,
    threshold: float = 0.3,
) -> bool:
    """Helper to evaluate similarity_fn regardless of whether it returns:
    - (is_same: bool, score: float)
    - score: float
    - is_same: bool
    """
    res = similarity_fn(text_a, text_b)
    if isinstance(res, tuple) or isinstance(res, list):
        # (is_same, score) contract
        is_same = res[0]
        if isinstance(is_same, bool):
            return is_same
        return float(res[1]) >= threshold
    elif isinstance(res, bool):
        return res
    elif isinstance(res, (int, float)):
        return float(res) >= threshold
    return True


def get_stressor_threads(entries: list[dict]) -> dict[str, list[dict]]:
    """Group a user's entries by category. `entries` is a list of entry
    dicts as returned by database.get_entries_for_user (already sorted by
    date ascending)."""
    threads: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        threads[e["category"]].append(e)
    return dict(threads)


def refine_threads_with_similarity(
    category_entries: list[dict],
    similarity_fn: Callable[[str, str], Any],
    threshold: float = 0.3,
) -> list[list[dict]]:
    """Split one category's entries into finer sub-threads using pairwise
    similarity against each existing sub-thread's most recent entry.

    similarity_fn(text_a, text_b) -> (bool, float) | float | bool
    """
    if not category_entries:
        return []

    sub_threads: list[list[dict]] = [[category_entries[0]]]

    for entry in category_entries[1:]:
        placed = False
        for sub_thread in sub_threads:
            latest_in_group = sub_thread[-1]
            if _evaluate_similarity(similarity_fn, entry.get("transcript", ""), latest_in_group.get("transcript", ""), threshold):
                sub_thread.append(entry)
                placed = True
                break
        if not placed:
            sub_threads.append([entry])

    return sub_threads


def build_threads(
    entries: list[dict],
    similarity_fn: Optional[Callable[[str, str], Any]] = None,
    similarity_threshold: float = 0.3,
) -> dict[str, list[dict]]:
    """Top-level entry point: category threads, optionally refined into
    sub-threads. If similarity_fn is None, attempts to load is_same_stressor
    from app.stressor_similarity; if unavailable, falls back to pure
    category threading automatically.

    Sub-thread keys look like "Work/Career#0", "Work/Career#1" so downstream
    code (trend/severity) can treat them just like flat category threads.
    """
    category_threads = get_stressor_threads(entries)

    # If similarity_fn is not provided, try to use the default sentence transformer
    if similarity_fn is None:
        try:
            from app.stressor_similarity import is_same_stressor
            similarity_fn = is_same_stressor
        except Exception:
            similarity_fn = None

    if similarity_fn is None:
        return category_threads

    refined: dict[str, list[dict]] = {}
    for category, cat_entries in category_threads.items():
        sub_threads = refine_threads_with_similarity(cat_entries, similarity_fn, similarity_threshold)
        if len(sub_threads) <= 1:
            # no meaningful split — keep the plain category key
            refined[category] = sub_threads[0] if sub_threads else cat_entries
        else:
            for i, sub in enumerate(sub_threads):
                refined[f"{category}#{i}"] = sub

    return refined

