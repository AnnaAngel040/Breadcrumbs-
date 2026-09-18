"""
transcription.py

Wraps the Whisper API (OpenAI). We call the hosted API rather than running
Whisper locally — no GPU setup, single HTTP call. Whisper is a fixed,
off-the-shelf component here; it isn't the project's ML contribution
(that's Person A's classifier), so we don't fine-tune or modify it.

Written for openai-python v1.x client syntax.
"""

import os
from openai import OpenAI

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in, "
                "or set USE_MOCK_TRANSCRIPTION=true in your environment to bypass Whisper "
                "while building the rest of the pipeline."
            )
        _client = OpenAI(api_key=api_key)
    return _client


def transcribe(audio_file_path: str) -> str:
    """Send an audio file to Whisper and return the transcript text.

    Raises FileNotFoundError if the path doesn't exist, and whatever the
    OpenAI client raises on API errors (network issues, bad key, etc.) —
    let these bubble up to the route handler, which turns them into a
    clean HTTP error rather than a raw stack trace.
    """
    if not os.path.exists(audio_file_path):
        raise FileNotFoundError(f"No audio file at {audio_file_path}")

    client = _get_client()
    with open(audio_file_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
        )
    return transcript.text


def transcribe_mock(audio_file_path: str) -> str:
    """Stand-in for transcribe() so you can test the pipeline without an
    OpenAI key or real audio files. Returns a placeholder transcript based
    on the filename, so different test files still produce different text.
    """
    base = os.path.basename(audio_file_path)
    return f"[mock transcript for {base}] Work has been really overwhelming lately, my manager keeps piling on deadlines."
