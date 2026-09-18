"""
matching.py  (Part 5 of the guide: Therapist Matching)

Simple lookup against a static, hardcoded directory. No ML needed here —
that's fine to say plainly to a judge; not every part of the app needs to
be a model.
"""

import json
import os

_THERAPISTS_PATH = os.path.join(os.path.dirname(__file__), "therapists.json")

with open(_THERAPISTS_PATH, "r") as f:
    THERAPISTS: list[dict] = json.load(f)


def match_therapists(top_category: str, severity: str) -> list[dict]:
    """Returns up to 3 therapists matching the category. For "high" or
    "flagged" severity, restricts to therapists who can take standard or
    intensive-tier cases (i.e. excludes any lighter-touch-only tiers if
    you add them later)."""
    # Strip any "#0"/"#1" similarity sub-thread suffix before matching,
    # since the directory is organized by the base category.
    base_category = top_category.split("#")[0]

    matches = [t for t in THERAPISTS if t["specialty"] == base_category]

    if severity in ("high", "flagged"):
        matches = [t for t in matches if t["tier"] in ("standard", "intensive")]

    return matches[:3]
