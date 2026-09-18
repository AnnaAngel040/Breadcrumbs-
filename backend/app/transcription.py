"""
transcription.py

Local Whisper speech-to-text inference using the `openai-whisper` library.
Runs 100% locally and offline on CPU without paid API keys or external network calls.
"""

import logging
import os

logger = logging.getLogger(__name__)

_local_whisper_model = None


def _get_whisper_model():
    """Lazily load the lightweight Whisper 'base' model on CPU when first needed."""
    global _local_whisper_model
    if _local_whisper_model is None:
        try:
            import whisper
        except ImportError:
            raise RuntimeError(
                "The 'openai-whisper' package is not installed. "
                "Install it with: pip install openai-whisper torch"
            )
        logger.info("Loading local Whisper 'base' model on CPU...")
        _local_whisper_model = whisper.load_model("base", device="cpu")
        logger.info("Local Whisper 'base' model loaded successfully.")
    return _local_whisper_model


def transcribe(audio_file_path: str) -> str:
    """Transcribe an audio file locally using Whisper on CPU.

    Raises FileNotFoundError if the path doesn't exist.
    """
    if not os.path.exists(audio_file_path):
        raise FileNotFoundError(f"No audio file at {audio_file_path}")

    model = _get_whisper_model()
    # fp16=False ensures clean execution on CPU without warnings
    result = model.transcribe(audio_file_path, fp16=False)
    return result["text"].strip()


def transcribe_mock(audio_file_path: str) -> str:
    """Stand-in for transcribe() so you can test the pipeline without
    loading the Whisper model or needing real audio files. Returns a
    placeholder transcript based on the filename.
    """
    base = os.path.basename(audio_file_path)
    return f"[mock transcript for {base}] Work has been really overwhelming lately, my manager keeps piling on deadlines."

