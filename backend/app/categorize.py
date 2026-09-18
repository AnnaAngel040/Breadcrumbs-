"""
categorize.py

Separate from Person A's model on purpose. A's DistilBERT is fine-tuned
only for binary stress classification (stressed / not stressed) — Dreaddit
doesn't have labeled data covering half our taxonomy (no Work/Career or
Academics subreddits), so forcing A's model to output a category would mean
faking performance on categories it was never trained on. This module is
the honest fix: a separate layer that answers "about what," while A's
model answers "how stressed."

Runs completely offline and free using local keyword taxonomy matching and
heuristic trigger extraction. Zero paid API keys, zero external network calls.

CANONICAL_CATEGORIES here is the single source of truth for the
taxonomy — therapists.json and match_therapists() stay in sync with
this list.
"""

import json
import logging
import os
import re
import socket
import time
from typing import Optional
import urllib.request
import urllib.error

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

# Local Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
USE_OLLAMA_REASONING = os.getenv("USE_OLLAMA_REASONING", "true").lower() == "true"
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "5.0"))

_ollama_alive = None
_last_check = 0.0


def is_ollama_running() -> bool:
    """Fast probe to check if local Ollama service is listening on port 11434.
    Caches result for 15s to keep unit tests and offline requests instantaneous.
    """
    global _ollama_alive, _last_check
    now = time.time()
    if _ollama_alive is not None and (now - _last_check) < 15.0:
        return _ollama_alive

    _last_check = now
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.15)
    try:
        s.connect(("127.0.0.1", 11434))
        s.close()
        _ollama_alive = True
    except Exception:
        _ollama_alive = False
    return _ollama_alive


# --- local keyword matching & reason extraction ----------------------------
# Runs completely offline and locally without paid API credits.
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
    """Categorizes the transcript and extracts a concise trigger reason completely offline."""
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


def extract_reason_ollama(transcript: str, category: str) -> Optional[str]:
    """Extracts specific trigger reason using local Ollama (e.g. llama3.2:1b).
    Runs 100% locally, zero paid API cost, zero internet dependency at inference time.
    Returns None if Ollama is not running or times out, allowing clean fallback.
    """
    if not USE_OLLAMA_REASONING or not is_ollama_running():
        return None

    prompt = (
        f'In one short sentence (under 15 words), state the specific cause of stress in this diary entry, '
        f'given it falls under the category "{category}". Only output the sentence, nothing else.\n\n'
        f'Diary entry: "{transcript}"\n\n'
        f'Cause:'
    )

    try:
        req_data = json.dumps({
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": 40},
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/generate",
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            if resp.status == 200:
                result = json.loads(resp.read().decode("utf-8"))
                raw_text = result.get("response", "").strip()
                cleaned = re.sub(r"^(cause|reason):\s*", "", raw_text, flags=re.IGNORECASE).strip(' "\'')
                return cleaned if cleaned else None
    except Exception as e:
        logger.debug("Ollama reason extraction unavailable (%s)", e)
        return None
    return None


# --- Model 2 (TF-IDF + Logistic Regression) Primary Categorizer --------------
_model2_vectorizer = None
_model2_classifier = None
_model2_load_attempted = False

MODEL2_SEARCH_PATHS = [
    os.path.join(os.path.dirname(__file__), "models"),
    os.path.dirname(__file__),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    os.getcwd(),
]


def _get_model2():
    """Lazily loads Model 2 (TF-IDF Vectorizer + Logistic Regression Classifier)
    from disk if the .pkl files are present.
    """
    global _model2_vectorizer, _model2_classifier, _model2_load_attempted
    if _model2_load_attempted:
        return _model2_vectorizer, _model2_classifier

    _model2_load_attempted = True
    import pickle
    import warnings

    for base_dir in MODEL2_SEARCH_PATHS:
        vec_path = os.path.join(base_dir, "model2_vectorizer.pkl")
        clf_path = os.path.join(base_dir, "model2_classifier.pkl")
        # Also check common typo variant
        if not os.path.exists(clf_path):
            clf_path = os.path.join(base_dir, "model2_classifer.pkl")

        if os.path.exists(vec_path) and os.path.exists(clf_path):
            try:
                logger.info("Loading Model 2 (TF-IDF Vectorizer & Classifier) from %s...", base_dir)
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    with open(vec_path, "rb") as f:
                        _model2_vectorizer = pickle.load(f)
                    with open(clf_path, "rb") as f:
                        _model2_classifier = pickle.load(f)
                logger.info("Model 2 loaded successfully.")
                return _model2_vectorizer, _model2_classifier
            except Exception as e:
                logger.warning("Failed to load Model 2 from %s: %s", base_dir, e)

    return None, None


def predict_model2(transcript: str) -> Optional[dict]:
    """Runs inference on Model 2 if available.
    Returns {'category': str, 'confidence': float} or None if model files are not present.
    """
    vec, clf = _get_model2()
    if vec is None or clf is None:
        return None

    try:
        text_tfidf = vec.transform([transcript])
        category = clf.predict(text_tfidf)[0]
        probabilities = clf.predict_proba(text_tfidf)[0]
        confidence = float(max(probabilities))

        # If model predicted 'Other' or non-canonical category, fall back to keyword classification
        if category not in CANONICAL_CATEGORIES or category == "Other":
            kw = _categorize_keyword(transcript)
            return {"category": kw["category"], "confidence": confidence, "model2_raw_category": category}

        return {"category": category, "confidence": confidence}
    except Exception as e:
        logger.warning("Model 2 prediction failed: %s", e)
        return None


# --- public entry points ---------------------------------------------------

def categorize_with_reason(transcript: str) -> dict:
    """Returns dict {'category': str, 'reason': str}.
    1. Primary: Runs Model 2 (TF-IDF + Logistic Regression).
    2. Fallback: If Model 2 is not yet installed or returns 'Other', uses local keyword matching.
    3. Reason Extraction: Uses local Ollama (Llama 3.2 1B) if running, else keyword-derived trigger.
    """
    category = None
    reason = None

    # 1. Try Model 2 as primary source
    m2_result = predict_model2(transcript)
    if m2_result:
        category = m2_result["category"]

    # 2. Fallback to keyword matching if Model 2 is unavailable
    kw_result = _categorize_keyword(transcript)
    if not category:
        category = kw_result["category"]
    reason = kw_result["reason"]

    # 3. Enhance trigger reasoning via local Ollama if running
    ollama_reason = extract_reason_ollama(transcript, category)
    if ollama_reason:
        reason = ollama_reason

    return {"category": category, "reason": reason}


def categorize(transcript: str) -> str:
    """Convenience wrapper returning just the category string for backward compatibility."""
    return categorize_with_reason(transcript)["category"]


