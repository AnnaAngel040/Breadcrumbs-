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

from backend.backend.app import transcription
from backend.backend.app import database, model_client

USE_MOCK_TRANSCRIPTION = os.getenv("USE_MOCK_TRANSCRIPTION", "true").lower() == "true"


def process_audio_entry(user_id: str, audio_file_path: str) -> dict:
    if USE_MOCK_TRANSCRIPTION:
        transcript = transcription.transcribe_mock(audio_file_path)
    else:
        transcript = transcription.transcribe(audio_file_path)

    return process_text_entry(user_id, transcript)


def process_text_entry(user_id: str, transcript: str) -> dict:
    """Skips transcription — used for the text-entry testing route, and
    internally by process_audio_entry() once it has a transcript."""
    prediction = model_client.get_stress_prediction(transcript)

    entry = database.insert_entry(
        user_id=user_id,
        transcript=transcript,
        category=prediction["category"],
        stress_score=prediction["stress_score"],
        confidence=prediction["confidence"],
    )
    return entry
