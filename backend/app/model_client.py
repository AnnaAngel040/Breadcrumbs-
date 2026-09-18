"""
model_client.py

Handles binary stress classification and stress scoring for transcribed diary text.
Supports 4 operational modes seamlessly:
  1. Local Scikit-Learn Model 1 (.pkl): If model1_classifier.pkl and model1_vectorizer.pkl
     (or model1_pipeline.pkl / model1.pkl) exist in backend/app/, loads scikit-learn model.
  2. Local In-Process DistilBERT/Transformers: If ./stress_model/ exists and torch/transformers
     are installed, loads fine-tuned PyTorch model into memory.
  3. Remote HTTP API: If MODEL_API_URL is configured and USE_MOCK_MODEL=false, calls remote endpoint.
  4. Heuristic Fallback: If no trained model files exist yet, returns realistic, testable scores.

CONTRACT WITH PERSON A (MODEL 1):
  Input:  transcript string
  Output: {"stress_score": float 0-1, "confidence": float 0-1, "is_stressor": bool}
"""

import logging
import os
import json
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8001/predict")
def _get_model_local_path():
    env_path = os.getenv("MODEL_LOCAL_PATH", "")
    if env_path and os.path.exists(env_path):
        return env_path
    app_dir = os.path.dirname(__file__)
    p1 = os.path.join(app_dir, "stress_model")
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(os.path.dirname(app_dir), "stress_model")
    if os.path.exists(p2):
        return p2
    return p1


MODEL_LOCAL_PATH = _get_model_local_path()
USE_MOCK_MODEL = os.getenv("USE_MOCK_MODEL", "false").lower() == "true"

# Scikit-Learn Model 1 Cache
_m1_vectorizer = None
_m1_classifier = None
_m1_pipeline = None
_m1_sklearn_attempted = False

# PyTorch/Transformers Model 1 Cache
_m1_torch_model = None
_m1_torch_tokenizer = None
_m1_torch_device = None
_m1_torch_attempted = False


def _get_sklearn_model():
    """Lazily load scikit-learn Model 1 from .pkl files if placed in backend/app/."""
    global _m1_vectorizer, _m1_classifier, _m1_pipeline, _m1_sklearn_attempted
    if _m1_sklearn_attempted:
        return _m1_vectorizer, _m1_classifier, _m1_pipeline

    _m1_sklearn_attempted = True
    app_dir = os.path.dirname(__file__)

    # Try combined pipeline first (model1.pkl or model1_pipeline.pkl)
    for pipe_name in ["model1_pipeline.pkl", "model1.pkl"]:
        pipe_path = os.path.join(app_dir, pipe_name)
        if os.path.exists(pipe_path):
            try:
                import joblib
                _m1_pipeline = joblib.load(pipe_path)
                logger.info(f"Loaded scikit-learn Model 1 pipeline from {pipe_name}")
                return None, None, _m1_pipeline
            except Exception as e:
                logger.warning(f"Failed to load {pipe_name}: {e}")

    # Try separate vectorizer and classifier (model1_vectorizer.pkl + model1_classifier.pkl)
    vec_path = os.path.join(app_dir, "model1_vectorizer.pkl")
    clf_path = os.path.join(app_dir, "model1_classifier.pkl")

    if os.path.exists(vec_path) and os.path.exists(clf_path):
        try:
            import joblib
            _m1_vectorizer = joblib.load(vec_path)
            _m1_classifier = joblib.load(clf_path)
            logger.info("Loaded scikit-learn Model 1 (vectorizer + classifier) successfully.")
            return _m1_vectorizer, _m1_classifier, None
        except Exception as e:
            logger.warning(f"Failed to load Model 1 pkl files: {e}")

    return None, None, None


def _predict_sklearn(transcript: str, vec, clf, pipe) -> dict:
    """Run inference using loaded scikit-learn Model 1."""
    if pipe is not None:
        if hasattr(pipe, "predict_proba"):
            probs = pipe.predict_proba([transcript])[0]
            # Assumes class 1 is stressor, class 0 is non-stressor
            stress_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
            confidence = float(max(probs))
        else:
            pred = pipe.predict([transcript])[0]
            stress_score = 0.85 if pred in (1, "1", "stress", "stressor") else 0.15
            confidence = 0.85
    else:
        X = vec.transform([transcript])
        if hasattr(clf, "predict_proba"):
            probs = clf.predict_proba(X)[0]
            stress_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
            confidence = float(max(probs))
        else:
            pred = clf.predict(X)[0]
            stress_score = 0.85 if pred in (1, "1", "stress", "stressor") else 0.15
            confidence = 0.85

    return {
        "stress_score": round(min(1.0, max(0.0, stress_score)), 4),
        "confidence": round(min(1.0, max(0.0, confidence)), 4),
        "is_stressor": stress_score >= 0.40,
    }


def _get_torch_model():
    """Lazily load fine-tuned PyTorch / HuggingFace model if directory exists."""
    global _m1_torch_model, _m1_torch_tokenizer, _m1_torch_device, _m1_torch_attempted
    if _m1_torch_attempted:
        return _m1_torch_model, _m1_torch_tokenizer, _m1_torch_device

    _m1_torch_attempted = True
    model_path = _get_model_local_path()
    if not os.path.exists(model_path):
        return None, None, None

    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        logger.info(f"Loading PyTorch Model 1 from {model_path}...")
        _m1_torch_tokenizer = AutoTokenizer.from_pretrained(model_path)
        _m1_torch_model = AutoModelForSequenceClassification.from_pretrained(model_path)
        _m1_torch_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _m1_torch_model.to(_m1_torch_device)
        _m1_torch_model.eval()
        logger.info("PyTorch Model 1 loaded successfully.")
        return _m1_torch_model, _m1_torch_tokenizer, _m1_torch_device
    except Exception as e:
        logger.warning(f"Could not load PyTorch model from {model_path}: {e}")
        return None, None, None


def _predict_torch(transcript: str, model, tokenizer, device) -> dict:
    """Run inference locally on PyTorch / Transformers model."""
    import torch
    inputs = tokenizer(transcript, return_tensors="pt", truncation=True, padding=True, max_length=256)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1)[0]
    stress_score = float(probs[1].item()) if len(probs) > 1 else float(probs[0].item())
    confidence = float(torch.max(probs).item())
    return {
        "stress_score": round(min(1.0, max(0.0, stress_score)), 4),
        "confidence": round(min(1.0, max(0.0, confidence)), 4),
        "is_stressor": stress_score >= 0.40,
    }


def _heuristic_predict(transcript: str) -> dict:
    """Deterministic, keyword-informed prediction for fallback testing."""
    stress_keywords = [
        "overwhelm", "deadline", "anxious", "panic", "can't sleep", "exhausted",
        "pressure", "cried", "crying", "cry", "rough", "struggling", "scared", "worried", "terrible",
        "failing", "cannot afford", "argument", "fight", "alone", "hopeless", "breakup", "break up",
        "evict", "evicted", "eviction", "no money", "broke", "homework", "horrible", "spiral", "fired",
        "hate", "ruined", "stress", "stressed", "depressed", "depression", "sad", "sick", "pain"
    ]
    lowered = transcript.lower()
    matches = sum(kw in lowered for kw in stress_keywords)
    if matches > 0:
        score = min(0.95, 0.55 + (matches * 0.12))
        conf = min(0.95, 0.75 + (matches * 0.05))
        is_stress = True
    else:
        score = 0.15
        conf = 0.85
        is_stress = False

    return {
        "stress_score": round(score, 3),
        "confidence": round(conf, 3),
        "is_stressor": is_stress,
    }


def get_stress_prediction(transcript: str) -> dict:
    """Returns {"stress_score": float, "confidence": float, "is_stressor": bool}.
    Checks scikit-learn (.pkl) -> PyTorch/Transformers -> Remote API -> Heuristic Fallback.
    """
    if not USE_MOCK_MODEL:
        # 1. Try local Scikit-Learn Model (.pkl)
        vec, clf, pipe = _get_sklearn_model()
        if pipe is not None or (vec is not None and clf is not None):
            try:
                return _predict_sklearn(transcript, vec, clf, pipe)
            except Exception as e:
                logger.warning(f"Scikit-learn Model 1 inference failed: {e}")

        # 2. Try local PyTorch / DistilBERT model
        torch_model, tokenizer, device = _get_torch_model()
        if torch_model is not None and tokenizer is not None:
            try:
                return _predict_torch(transcript, torch_model, tokenizer, device)
            except Exception as e:
                logger.warning(f"PyTorch Model 1 inference failed: {e}")

        # 3. Try remote API endpoint (e.g. FastAPI service / Colab ngrok)
        try:
            payload = json.dumps({"text": transcript, "transcript": transcript}).encode("utf-8")
            req = urllib.request.Request(
                MODEL_API_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_score = float(data.get("stress_score", data.get("score", 0.5)))
                raw_conf = float(data.get("confidence", 0.8))
                return {
                    "stress_score": round(raw_score, 4),
                    "confidence": round(raw_conf, 4),
                    "is_stressor": data.get("is_stressor", raw_score >= 0.5),
                }
        except Exception:
            pass

    # 4. Heuristic fallback
    return _heuristic_predict(transcript)
