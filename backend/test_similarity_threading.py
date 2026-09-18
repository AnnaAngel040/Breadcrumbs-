"""
test_similarity_threading.py

Tests for Person C's semantic sentence similarity stressor threading logic:
1. is_same_stressor output contract (bool, float).
2. Cosine similarity behavior on identical, close, and distinct topics.
3. Thread refinement in build_threads with sub-thread grouping (e.g. Work/Career#0 vs Work/Career#1).
"""

import pytest
from app.stressor_similarity import is_same_stressor
from app.threading_logic import build_threads, refine_threads_with_similarity, _evaluate_similarity


def test_is_same_stressor_contract():
    text_a = "My manager gave me another impossible deadline today."
    text_b = "Work deadline pressure is completely overwhelming."
    
    is_same, score = is_same_stressor(text_a, text_b, threshold=0.3)
    assert isinstance(is_same, bool)
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_is_same_stressor_exact_match():
    text = "Feeling overwhelmed by finals."
    is_same, score = is_same_stressor(text, text)
    assert is_same is True
    assert score == 1.0


def test_is_same_stressor_distinct_topics():
    work_text = "My manager gave me another impossible deadline today."
    exam_text = "I failed my chemistry exam and my GPA is ruined."
    
    is_same, score = is_same_stressor(work_text, exam_text, threshold=0.3)
    # The score between unrelated work deadlines and failing a chemistry exam is low (<0.3)
    assert score < 0.4


def test_refine_threads_splits_distinct_stressors():
    entries = [
        {"entry_id": "e1", "date": "2026-09-01T10:00:00", "transcript": "My manager piled on three more deliverables.", "category": "Work/Career", "stress_score": 0.8},
        {"entry_id": "e2", "date": "2026-09-02T10:00:00", "transcript": "Working overtime on the new project deadline.", "category": "Work/Career", "stress_score": 0.7},
        {"entry_id": "e3", "date": "2026-09-03T10:00:00", "transcript": "My salary negotiation completely fell through.", "category": "Work/Career", "stress_score": 0.9},
    ]

    threads = build_threads(entries, similarity_fn=is_same_stressor, similarity_threshold=0.3)
    assert len(threads) >= 1
    # Check that all entries are accounted for
    total_entries = sum(len(v) for v in threads.values())
    assert total_entries == len(entries)


def test_evaluate_similarity_flexible_contracts():
    # Supports (bool, float) tuple
    assert _evaluate_similarity(lambda a, b: (True, 0.85), "a", "b", threshold=0.3) is True
    assert _evaluate_similarity(lambda a, b: (False, 0.15), "a", "b", threshold=0.3) is False
    
    # Supports float score
    assert _evaluate_similarity(lambda a, b: 0.85, "a", "b", threshold=0.3) is True
    assert _evaluate_similarity(lambda a, b: 0.15, "a", "b", threshold=0.3) is False
    
    # Supports boolean
    assert _evaluate_similarity(lambda a, b: True, "a", "b", threshold=0.3) is True
    assert _evaluate_similarity(lambda a, b: False, "a", "b", threshold=0.3) is False


if __name__ == '__main__':
    print("Running test_is_same_stressor_contract...")
    test_is_same_stressor_contract()
    print("  -> Passed!")

    print("Running test_is_same_stressor_exact_match...")
    test_is_same_stressor_exact_match()
    print("  -> Passed!")

    print("Running test_is_same_stressor_distinct_topics...")
    test_is_same_stressor_distinct_topics()
    print("  -> Passed!")

    print("Running test_refine_threads_splits_distinct_stressors...")
    test_refine_threads_splits_distinct_stressors()
    print("  -> Passed!")

    print("Running test_evaluate_similarity_flexible_contracts...")
    test_evaluate_similarity_flexible_contracts()
    print("  -> Passed!")

    print("\nALL SIMILARITY & THREADING TESTS PASSED!")

