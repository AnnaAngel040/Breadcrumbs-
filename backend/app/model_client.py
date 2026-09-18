"""
model_client.py

Handles stress classification for transcribed diary text.
Supports 3 operational modes seamlessly:
  1. Local In-Process Model: If ./stress_model/ exists and torch/transformers are installed,
     loads Person A's fine-tuned DistilBERT directly into memory (zero latency, no external server).
  2. Remote HTTP API: If MODEL_API_URL is configured and USE_MOCK_MODEL=false, calls Person A's
     endpoint (e.g. running on Google Colab via ngrok, or on http://localhost:8001/predict).
  3. Deterministic Mock: If USE_MOCK_MODEL=true or neither above is ready, returns realistic
     simulated scores so the entire backend remains testable and runnable offline.

CONTRACT WITH PERSON A:
  Input:  transcript string (or {"text": "..."})
  Output: {"stress_score": float 0-1, "confidence": float 0-1}
"""

import logging
import os
import random
import requests

logger = logging.getLogger(__name__)

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8001/predict")
MODEL_LOCAL_PATH = os.getenv("MODEL_LOCAL_PATH", "./stress_model")
USE_MOCK_MODEL = os.getenv("USE_MOCK_MODEL", "true").lower() == "true"

# Cache for locally loaded DistilBERT model & tokenizer
_local_model = None
_local_tokenizer = None
_local_device = None
_local_load_attempted = False


def _get_local_model():
    """Lazily load the fine-tuned DistilBERT model from MODEL_LOCAL_PATH if available."""
    global _local_model, _local_tokenizer, _local_device, _local_load_attempted
    if _local_load_attempted:
        return _local_model, _local_tokenizer, _local_device

    _local_load_attempted = True
    if not os.path.exists(MODEL_LOCAL_PATH):
        return None, None, None

    try:
        import torch
        from transformers import DistilBertForSequenceClassification, DistilBertTokenizer

        logger.info(f"Loading fine-tuned DistilBERT model from {MODEL_LOCAL_PATH}...")
        _local_tokenizer = DistilBertTokenizer.from_pretrained(MODEL_LOCAL_PATH)
        _local_model = DistilBertForSequenceClassification.from_pretrained(MODEL_LOCAL_PATH)

        _local_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _local_model.to(_local_device)
        _local_model.eval()  # Set evaluation mode
        logger.info(f"DistilBERT model loaded successfully on device {_local_device}.")
        return _local_model, _local_tokenizer, _local_device
    except Exception as e:
        logger.warning(f"Could not load local model from {MODEL_LOCAL_PATH}: {e}")
        return None, None, None


def _predict_local(transcript: str, model, tokenizer, device) -> dict:
    """Runs inference locally on Person A's fine-tuned DistilBERT."""
    import torch

    inputs = tokenizer(transcript, return_tensors="pt", truncation=True, padding=True, max_length=256)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1)
    stress_score = probs[0][1].item()
    confidence = torch.max(probs[0]).item()
    return {
        "stress_score": round(stress_score, 4),
        "confidence": round(confidence, 4),
    }


def _normalize(raw: dict) -> dict:
    """Map whatever keys A's API actually returns onto our canonical shape."""
    return {
        "stress_score": float(raw["stress_score"]),
        "confidence": float(raw["confidence"]),
    }


def _mock_predict(transcript: str) -> dict:
    """Deterministic-ish fake prediction so pipeline behavior is testable."""
    stress_words = ["overwhelm", "deadline", "anxious", "can't sleep", "exhausted", "pressure", "cried", "rough"]
    lowered = transcript.lower()
    base = 0.3 + 0.1 * sum(w in lowered for w in stress_words)
    score = min(0.95, base + random.uniform(-0.05, 0.05))
    return {
        "stress_score": round(score, 3),
        "confidence": round(random.uniform(0.6, 0.95), 3),
    }


def get_stress_prediction(transcript: str) -> dict:
    """Returns {"stress_score": float, "confidence": float}.
    Checks local fine-tuned model first, then remote endpoint, then mock.
    """
    # 1. Try local fine-tuned model if directory exists and mock not explicitly forced
    if not USE_MOCK_MODEL:
        model, tokenizer, device = _get_local_model()
        if model is not None and tokenizer is not None:
            return _predict_local(transcript, model, tokenizer, device)

        # 2. Try remote API endpoint (e.g. Colab ngrok or local microservice)
        try:
            # Send both 'text' and 'transcript' keys so whatever Person A uses works
            payload = {"text": transcript, "transcript": transcript}
            resp = requests.post(MODEL_API_URL, json=payload, timeout=15)
            resp.raise_for_status()
            return _normalize(resp.json())
        except Exception as e:
            logger.warning(f"Remote model call to {MODEL_API_URL} failed: {e}. Falling back to mock.")

    # 3. Fallback to mock
    return _mock_predict(transcript)

