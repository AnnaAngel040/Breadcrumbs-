"""
matching.py  (Part 5: Therapist Matching & Routing)

Matches and ranks therapists based on:
1. Category / Specialty match (exact base category)
2. Severity tier triage (high/flagged routes to intensive/standard care)
3. Consultation mode compatibility (online vs. offline/in-person)
4. Geodesic distance using the Haversine formula (for in-person visits)
5. Multi-factor match ranking (proximity, tier match, rating)
"""

import json
import math
import os
from typing import Optional

_THERAPISTS_PATH = os.path.join(os.path.dirname(__file__), "therapists.json")


def get_all_therapists() -> list[dict]:
    with open(_THERAPISTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points on the Earth
    in kilometers using the Haversine formula."""
    R = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def match_therapists(
    top_category: str,
    severity: str,
    preferred_mode: str = "any",
    gender: Optional[str] = None,
    sliding_scale: Optional[bool] = None,
    insurance: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance_km: float = 50.0,
    limit: int = 3,
) -> list[dict]:
    """Returns therapists matching the category, filtered and
    ranked by severity tier, consultation mode, gender preference, sliding scale,
    insurance provider, and geographical distance.
    """
    base_category = top_category.split("#")[0]
    preferred_mode = (preferred_mode or "any").lower().strip()
    gender = (gender or "any").lower().strip()
    insurance = (insurance or "any").lower().strip()

    candidates = [t for t in get_all_therapists() if t.get("specialty") == base_category]

    # Tier filtering: For high/flagged severity, prioritize/require standard or intensive
    if severity in ("high", "flagged"):
        tier_candidates = [t for t in candidates if t.get("tier") in ("standard", "intensive")]
        if tier_candidates:
            candidates = tier_candidates

    scored_matches = []
    for t in candidates:
        modes = [m.lower() for m in t.get("modes", ["online"])]

        # Mode compatibility check
        if preferred_mode == "online" and "online" not in modes:
            continue
        if preferred_mode == "offline" and "offline" not in modes:
            continue

        # Gender preference check
        if gender != "any" and t.get("gender"):
            if t["gender"].lower() != gender:
                continue

        # Sliding scale priority check
        if sliding_scale is True and not t.get("sliding_scale", False):
            continue

        # Insurance check
        if insurance != "any" and insurance:
            insurances_lower = [ins.lower() for ins in t.get("insurances", [])]
            if not any(insurance in ins for ins in insurances_lower):
                continue

        # Distance calculation
        dist = None
        has_coords = (
            user_lat is not None
            and user_lng is not None
            and t.get("lat") is not None
            and t.get("lng") is not None
        )

        if has_coords:
            dist = haversine_km(user_lat, user_lng, t["lat"], t["lng"])
            if preferred_mode == "offline" and dist > max_distance_km:
                continue

        # Ranking score computation:
        # Base specialty match = 1.0
        score = 1.0

        # Tier bonus for high/flagged cases
        if severity in ("high", "flagged") and t.get("tier") == "intensive":
            score += 0.35

        # Mode match bonus
        if preferred_mode in modes:
            score += 0.20

        # Insurance match bonus
        if insurance != "any" and insurance:
            score += 0.25

        # Distance score
        if dist is not None:
            proximity_score = max(0.0, 1.0 - (dist / max_distance_km))
            score += 0.40 * proximity_score
        elif "online" in modes and preferred_mode in ("online", "any"):
            score += 0.30  # Online access bonus when location is not an obstacle

        # Rating factor
        rating = t.get("rating", 4.5)
        score += (rating / 5.0) * 0.15

        res = dict(t)
        res["distance_km"] = dist
        res["match_score"] = round(score, 3)
        if not res.get("match_percentage"):
            res["match_percentage"] = int(min(99, max(85, round((score / 2.0) * 100))))
        scored_matches.append(res)

    # Sort descending by match_score
    scored_matches.sort(key=lambda m: m["match_score"], reverse=True)
    return scored_matches[:limit]

