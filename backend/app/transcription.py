"""
transcription.py

Local Whisper speech-to-text inference using the `openai-whisper` library.
Runs 100% locally and offline on CPU without paid API keys or external network calls.
"""

import logging
import os

logger = logging.getLogger(__name__)

_local_whisper_model = None


def _ensure_ffmpeg():
    """Ensure ffmpeg is in PATH for whisper audio decoding."""
    try:
        import imageio_ffmpeg
        ffmpeg_src = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = os.path.dirname(ffmpeg_src)
        ffmpeg_exe = os.path.join(ffmpeg_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        if not os.path.exists(ffmpeg_exe):
            import shutil
            shutil.copyfile(ffmpeg_src, ffmpeg_exe)
        if ffmpeg_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    except Exception as e:
        logger.debug("Could not auto-configure ffmpeg from imageio-ffmpeg: %s", e)


def _get_whisper_model():
    """Lazily load the lightweight Whisper model on CPU when first needed."""
    global _local_whisper_model
    if _local_whisper_model is None:
        _ensure_ffmpeg()
        try:
            import whisper
        except ImportError:
            raise RuntimeError(
                "The 'openai-whisper' package is not installed. "
                "Install it with: pip install openai-whisper torch"
            )
        model_name = os.getenv("WHISPER_MODEL", "tiny")
        logger.info("Loading local Whisper '%s' model on CPU...", model_name)
        _local_whisper_model = whisper.load_model(model_name, device="cpu")
        logger.info("Local Whisper '%s' model loaded successfully.", model_name)
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

