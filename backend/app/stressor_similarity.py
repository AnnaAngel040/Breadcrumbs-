"""
stressor_similarity.py

Pretrained sentence-embedding similarity module using all-MiniLM-L6-v2 (sentence-transformers).
Decides whether two transcripts in the same category refer to the same underlying stressor.
"""

from typing import Tuple, Optional

_model = None

def get_similarity_model():
    """Lazy load the sentence transformer model on demand."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def is_same_stressor(text_a: str, text_b: str, threshold: float = 0.3) -> Tuple[bool, float]:
    """
    Given two pieces of transcript text already in the same category,
    decides whether they're specifically about the same underlying stressor
    or should be split into separate sub-threads.

    Input:
        text_a, text_b: transcript strings to compare
        threshold: minimum cosine similarity score (tuned default: 0.3)

    Returns:
        (is_same: bool, score: float)
    """
    if not text_a or not text_b:
        return False, 0.0
    if text_a.strip() == text_b.strip():
        return True, 1.0

    try:
        from sentence_transformers import util
        model = get_similarity_model()
        embeddings = model.encode([text_a, text_b], convert_to_tensor=True)
        score = float(util.cos_sim(embeddings[0], embeddings[1]).item())
        is_same = score >= threshold
        return is_same, score
    except Exception as e:
        # Graceful fallback: return True so category-level threading continues to work
        return True, 1.0
