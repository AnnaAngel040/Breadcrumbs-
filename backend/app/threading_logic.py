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
from typing import Callable, Optional


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
    similarity_fn: Callable[[str, str], float],
    threshold: float = 0.7,
) -> list[list[dict]]:
    """Split one category's entries into finer sub-threads using pairwise
    similarity against each existing sub-thread's most recent entry.

    similarity_fn(text_a, text_b) -> float in [0, 1], supplied by Person C.

    Greedy single-pass grouping: for each entry (in date order), compare it
    to the latest entry of each existing sub-thread; join the first
    sub-thread that clears `threshold`, else start a new one. This is
    intentionally simple — good enough to demo, not claiming to be optimal
    clustering.
    """
    if not category_entries:
        return []

    sub_threads: list[list[dict]] = [[category_entries[0]]]

    for entry in category_entries[1:]:
        placed = False
        for sub_thread in sub_threads:
            latest_in_group = sub_thread[-1]
            score = similarity_fn(entry["transcript"], latest_in_group["transcript"])
            if score >= threshold:
                sub_thread.append(entry)
                placed = True
                break
        if not placed:
            sub_threads.append([entry])

    return sub_threads


def build_threads(
    entries: list[dict],
    similarity_fn: Optional[Callable[[str, str], float]] = None,
    similarity_threshold: float = 0.7,
) -> dict[str, list[dict]]:
    """Top-level entry point: category threads, optionally refined into
    sub-threads. If similarity_fn is None (C's function isn't wired up
    yet), falls back to pure category threading automatically.

    Sub-thread keys look like "Work/Career#0", "Work/Career#1" so downstream
    code (trend/severity) can treat them just like flat category threads.
    """
    category_threads = get_stressor_threads(entries)

    if similarity_fn is None:
        return category_threads

    refined: dict[str, list[dict]] = {}
    for category, cat_entries in category_threads.items():
        sub_threads = refine_threads_with_similarity(cat_entries, similarity_fn, similarity_threshold)
        if len(sub_threads) == 1:
            # no meaningful split — keep the plain category key
            refined[category] = sub_threads[0]
        else:
            for i, sub in enumerate(sub_threads):
                refined[f"{category}#{i}"] = sub

    return refined
