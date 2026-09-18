"""
model_client.py

Calls Person A's classifier endpoint over HTTP. Also ships a mock model so
you (Person B) aren't blocked waiting for A's API to be ready — build and
test your whole pipeline against the mock, then flip USE_MOCK_MODEL=false
in .env the moment A's endpoint is live. Nothing else in the pipeline needs
to change; get_stress_prediction() is the only seam.

CONTRACT WITH PERSON A (lock this down in writing before either of you
builds much):
    POST {MODEL_API_URL}
    body:     {"transcript": "<text>"}
    response: {"stress_score": float 0-1, "category": str, "confidence": float 0-1}

If A's field names differ (e.g. stressScore vs stress_score), fix it in
ONE place: the `_normalize()` function below, not scattered through the
codebase.
"""

import os
import random
import requests

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8001/predict")
USE_MOCK_MODEL = os.getenv("USE_MOCK_MODEL", "true").lower() == "true"

# Must match whatever 8-category taxonomy Person A's model actually outputs.
# Placeholder set — swap for the real list the moment A shares it.
CATEGORIES = [
    "Work/Career",
    "Relationship",
    "Family",
    "Health",
    "Finances",
    "Academic",
    "Social",
    "Other",
]


def _normalize(raw: dict) -> dict:
    """Map whatever keys A's API actually returns onto our canonical shape.
    Edit this if their JSON keys differ from the agreed contract."""
    return {
        "stress_score": float(raw["stress_score"]),
        "category": str(raw["category"]),
        "confidence": float(raw["confidence"]),
    }


def _mock_predict(transcript: str) -> dict:
    """Deterministic-ish fake prediction so pipeline behavior is testable.
    Nudges score up a bit if obviously stressed language is present, purely
    so demo data looks plausible — this has no bearing on the real model."""
    stress_words = ["overwhelm", "deadline", "anxious", "can't sleep", "exhausted", "pressure"]
    lowered = transcript.lower()
    base = 0.3 + 0.1 * sum(w in lowered for w in stress_words)
    score = min(0.95, base + random.uniform(-0.05, 0.05))
    return {
        "stress_score": round(score, 3),
        "category": random.choice(CATEGORIES),
        "confidence": round(random.uniform(0.6, 0.95), 3),
    }


def get_stress_prediction(transcript: str) -> dict:
    """Returns {"stress_score": float, "category": str, "confidence": float}."""
    if USE_MOCK_MODEL:
        return _mock_predict(transcript)

    resp = requests.post(MODEL_API_URL, json={"transcript": transcript}, timeout=15)
    resp.raise_for_status()
    return _normalize(resp.json())
