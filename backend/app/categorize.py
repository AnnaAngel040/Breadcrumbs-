"""
categorize.py

Separate from Person A's model on purpose. A's DistilBERT is fine-tuned
only for binary stress classification (stressed / not stressed) — Dreaddit
doesn't have labeled data covering half our taxonomy (no Work/Career or
Academics subreddits), so forcing A's model to output a category would mean
faking performance on categories it was never trained on. This module is
the honest fix: a separate layer that answers "about what," while A's
model answers "how stressed."

Two paths, always both available:
  1. LLM-based tagging (primary) — one structured-output call per
     transcript, asks for JSON back.
  2. Keyword matching (fallback) — zero dependencies, used automatically
     if the LLM call fails, times out, or no API key is configured. This
     keeps the demo from breaking live if the network or API has a bad
     moment.

CANONICAL_CATEGORIES here is now the single source of truth for the
taxonomy — therapists.json and match_therapists() should stay in sync with
this list. Owning this list here (instead of waiting on Person A) is what
unblocks the "get Person A's real category names" item from before.
"""

import json
import logging
import os
import re

logger = logging.getLogger(__name__)

CANONICAL_CATEGORIES = [
    "Work/Career",
    "Academics",
    "Relationship",
    "Family",
    "Friends/Social",
    "Health",
    "Finances",
    "Self-esteem/Identity",
]

USE_LLM_CATEGORIZATION = os.getenv("USE_LLM_CATEGORIZATION", "true").lower() == "true"

# --- fallback: keyword matching -------------------------------------------
# Kept short and reasonably precise per category. This is a safety net, not
# meant to be as accurate as the LLM path — it exists purely so a live demo
# never hard-fails if the LLM call is slow/unavailable.
KEYWORDS = {
    "Work/Career": ["deadline", "manager", "workload", "meeting", "boss", "coworker",
                     "promotion", "fired", "job", "shift", "overtime", "project due"],
    "Academics": ["exam", "professor", "homework", "assignment", "grade", "gpa",
                  "class", "lecture", "thesis", "midterm", "finals", "school"],
    "Relationship": ["boyfriend", "girlfriend", "partner", "breakup", "dating",
                      "marriage", "spouse", "husband", "wife", "relationship"],
    "Family": ["mom", "dad", "parent", "sibling", "brother", "sister",
               "family", "grandmother", "grandfather", "in-laws"],
    "Friends/Social": ["friend", "friendship", "social", "lonely", "isolated",
                        "party", "hang out", "group chat"],
    "Health": ["sick", "diagnosis", "doctor", "pain", "anxiety", "panic",
               "insomnia", "can't sleep", "therapy", "medication", "symptoms"],
    "Finances": ["rent", "bills", "debt", "money", "broke", "paycheck",
                 "loan", "budget", "eviction", "afford"],
    "Self-esteem/Identity": ["worthless", "identity", "who i am", "confidence",
                              "self-esteem", "not good enough", "imposter"],
}


def _categorize_keyword(transcript: str) -> dict:
    lowered = transcript.lower()
    scores = {}
    matched_kws = {}
    for cat, kws in KEYWORDS.items():
        hits = [kw for kw in kws if kw in lowered]
        scores[cat] = len(hits)
        matched_kws[cat] = hits

    best_cat = max(scores, key=scores.get)
    if scores[best_cat] == 0:
        best_cat = "Self-esteem/Identity" if "worthless" in lowered else "Health"
        reason = "general health or self-esteem concern"
    else:
        kws_str = ", ".join(matched_kws[best_cat][:2])
        reason = f"trigger: {kws_str}"

    return {"category": best_cat, "reason": reason}


# --- primary: LLM-based tagging -------------------------------------------

_client = None


def _get_openai_client():
    global _client
    if _client is None:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set")
        _client = OpenAI(api_key=api_key)
    return _client


def _categorize_llm(transcript: str) -> dict:
    client = _get_openai_client()
    categories_str = ", ".join(f'"{c}"' for c in CANONICAL_CATEGORIES)

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You classify a short diary entry into exactly one topic category "
                    f"from this fixed list: [{categories_str}], and identify the specific triggering reason. "
                    "Respond with ONLY a valid JSON object in this exact shape: "
                    "{\"category\": \"Work/Career\", \"reason\": \"manager assigning unmanageable workload\"} "
                    "where 'reason' is a concise 3-8 word phrase explaining the specific trigger or cause of stress. "
                    "Pick the single closest category even if the entry touches on more than one."
                ),
            },
            {"role": "user", "content": transcript},
        ],
        max_tokens=60,
        temperature=0,
    )

    raw = resp.choices[0].message.content.strip()
    # strip markdown code fences if the model adds them despite instructions
    raw = re.sub(r"^```(json)?|```$", "", raw.strip()).strip()
    parsed = json.loads(raw)
    category = parsed.get("category", "").strip()
    reason = parsed.get("reason", "").strip()

    if category not in CANONICAL_CATEGORIES:
        raise ValueError(f"LLM returned an out-of-taxonomy category: {category!r}")

    if not reason:
        reason = f"trigger related to {category.lower()}"

    return {"category": category, "reason": reason}


# --- public entry points ---------------------------------------------------

def categorize_with_reason(transcript: str) -> dict:
    """Returns dict {'category': str, 'reason': str}. Tries the LLM path first
    (if enabled and configured); falls back to keyword matching on any failure
    so this function never raises and never blocks the pipeline."""
    if USE_LLM_CATEGORIZATION:
        try:
            return _categorize_llm(transcript)
        except Exception as e:
            logger.warning("LLM categorization failed (%s); falling back to keyword matching.", e)

    return _categorize_keyword(transcript)


def categorize(transcript: str) -> str:
    """Convenience wrapper returning just the category string for backward compatibility."""
    return categorize_with_reason(transcript)["category"]
