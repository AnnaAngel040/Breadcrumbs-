"""
sentiment_intensity.py

Linguistic Intensity and Sentiment Analysis Layer for Person B.
Provides transparent, interpretable NLP heuristics to measure:
1. Negative valence (unpleasant emotional polarity)
2. High arousal (acute somatic/psychological stress indicators)
3. Absolutist thinking density (cognitive distortion marker)

Combines with Person A's binary DistilBERT model to produce a nuanced,
continuous stress intensity score.
"""

import re
from typing import Dict, Any

# High-arousal stress keywords (acute physiological and mental tension)
AROUSAL_KEYWORDS = {
    "panic", "panicking", "racing", "overwhelmed", "shaking", "terrified",
    "can't breathe", "suffocating", "heart pounding", "hyperventilating",
    "exploding", "screaming", "crying", "cry", "breakdown", "freaking out",
    "exhausted", "paralyzed", "jittery", "nauseous", "drowning", "breakup"
}

# Negative valence / depressive keywords (sorrow, low mood, despair)
NEGATIVE_VALENCE_KEYWORDS = {
    "sad", "depressed", "miserable", "hopeless", "worthless", "awful",
    "terrible", "horrible", "dreadful", "hating", "disaster", "ruined", "lonely",
    "unhappy", "drained", "guilty", "ashamed", "burden", "pointless",
    "breakup", "heartbroken", "cheated", "evicted", "eviction"
}

# Positive valence keywords (buffers / emotional resilience indicators)
POSITIVE_VALENCE_KEYWORDS = {
    "happy", "calm", "relieved", "relaxed", "peaceful", "grateful",
    "confident", "better", "improving", "supported", "hopeful", "glad"
}

# Absolutist keywords clinically associated with cognitive distortions (Al-Mosaiwi & Johnstone 2018)
ABSOLUTIST_KEYWORDS = {
    "always", "never", "completely", "totally", "nothing", "everything",
    "everyone", "no one", "constantly", "forever", "ruined", "impossible"
}


def analyze_linguistic_intensity(transcript: str) -> Dict[str, Any]:
    """Analyzes a transcript for emotional valence, arousal, and cognitive distortions.
    Returns metrics normalized between 0.0 and 1.0.
    """
    if not transcript or not transcript.strip():
        return {
            "valence": 0.5,
            "arousal": 0.0,
            "absolutist_density": 0.0,
            "sentiment_stress_score": 0.0,
        }

    text_lower = transcript.lower()
    words = re.findall(r"\b[a-z']+\b", text_lower)
    word_count = max(len(words), 1)

    arousal_hits = sum(1 for kw in AROUSAL_KEYWORDS if kw in text_lower)
    neg_hits = sum(1 for kw in NEGATIVE_VALENCE_KEYWORDS if kw in text_lower)
    pos_hits = sum(1 for kw in POSITIVE_VALENCE_KEYWORDS if kw in text_lower)
    absolutist_hits = sum(1 for kw in ABSOLUTIST_KEYWORDS if kw in text_lower)

    # Arousal score: bounded 0 to 1
    arousal_score = min(1.0, arousal_hits * 0.25)

    # Valence score: 0.0 = deeply negative, 1.0 = positive, 0.5 = neutral
    net_val = pos_hits - neg_hits
    valence_score = max(0.0, min(1.0, 0.5 + (net_val * 0.15)))

    # Absolutist density
    absolutist_density = min(1.0, (absolutist_hits / word_count) * 10.0)

    # Composite sentiment-based stress score:
    # High arousal + low valence (high negative) + absolutist distortions
    negativity = 1.0 - valence_score
    sentiment_stress = (
        0.45 * negativity +
        0.35 * arousal_score +
        0.20 * absolutist_density
    )

    return {
        "valence": round(valence_score, 3),
        "arousal": round(arousal_score, 3),
        "absolutist_density": round(absolutist_density, 3),
        "sentiment_stress_score": round(min(1.0, max(0.0, sentiment_stress)), 3),
    }


def fuse_stress_score(
    model_score: float,
    transcript: str,
    model_weight: float = 0.75,
) -> Dict[str, Any]:
    """Combines Person A's model probability with linguistic intensity analysis.
    
    Formula:
        S_fused = w_model * P_ML(stress) + (1 - w_model) * S_sentiment
    """
    analysis = analyze_linguistic_intensity(transcript)
    sent_score = analysis["sentiment_stress_score"]

    fused_score = (model_weight * model_score) + ((1.0 - model_weight) * sent_score)
    fused_score = round(min(1.0, max(0.0, fused_score)), 3)

    return {
        "fused_stress_score": fused_score,
        "raw_model_score": round(model_score, 3),
        "sentiment_analysis": analysis,
    }
