"""
pipeline.py  (Part 1, Step 3 of the guide: Wire the pipeline together)

    audio file -> transcribe() -> call Person A's model
        -> {stress_score, category, confidence}
        -> store as a new row in entries table

process_audio_entry() and process_text_entry() are the two entry points the
API routes call. Keeping this as its own module (rather than inline in
main.py) means the whole pipeline is unit-testable without spinning up
FastAPI at all.
"""

import os

from app import transcription, model_client, categorize, database

from dotenv import load_dotenv
load_dotenv()


ENABLE_SENTIMENT_FUSION = os.getenv("ENABLE_SENTIMENT_FUSION", "false").lower() == "true"


def is_mock_transcription() -> bool:
    return os.getenv("USE_MOCK_TRANSCRIPTION", "false").lower() == "true"


def process_audio_entry(user_id: str, audio_file_path: str) -> dict:
    if is_mock_transcription():
        transcript = transcription.transcribe_mock(audio_file_path)
    else:
        transcript = transcription.transcribe(audio_file_path)

    return process_text_entry(user_id, transcript)


def process_text_entry(user_id: str, transcript: str) -> dict:
    """Skips transcription — used for the text-entry testing route, and
    internally by process_audio_entry() once it has a transcript."""
    prediction = model_client.get_stress_prediction(transcript)
    cat_result = categorize.categorize_with_reason(transcript)
    category = cat_result["category"]
    reason = cat_result.get("reason")

    stress_score = prediction["stress_score"]
    if ENABLE_SENTIMENT_FUSION:
        from app.sentiment_intensity import fuse_stress_score
        fused = fuse_stress_score(stress_score, transcript)
        stress_score = fused["fused_stress_score"]

    from app.risk_keywords import check_acute_risk_keywords
    is_flagged = check_acute_risk_keywords(transcript)

    entry = database.insert_entry(
        user_id=user_id,
        transcript=transcript,
        category=category,
        reason=reason,
        stress_score=stress_score,
        confidence=prediction["confidence"],
    )
    entry["is_flagged"] = is_flagged
    entry["show_crisis_resources"] = is_flagged
    entry["is_stressor"] = bool(prediction.get("is_stressor") or stress_score >= 0.45 or is_flagged)
    return entry
