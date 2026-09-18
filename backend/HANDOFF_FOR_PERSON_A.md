# Backend API — Handoff for Person A (Model Specialist)

This document specifies the exact contract, runtime expectations, and validation procedures between **Person A** (DistilBERT Stress Classification Model) and **Person B** (Backend & Pipeline).

---

## 1. Scope Clarification: What Person A Owns vs. What Person B Owns

- **Person A owns**: Binary stress detection ($0 = \text{unstressed}, 1 = \text{stressed}$). You output a continuous probability $P(\text{stress})$ and model confidence.
- **Person B owns**: All 8-category topic classification (*Work/Career, Academics, Relationship, Family, Friends/Social, Health, Finances, Self-esteem/Identity*). 
  > **Note**: You do **not** need to fine-tune DistilBERT to output categories. Dreaddit does not cover this taxonomy; Person B handles categorization through a dedicated NLP layer (`app/categorize.py`).

---

## 2. API Contract (Locked)

Person B's pipeline calls your model over HTTP. Your service must expose:

### Endpoint
```http
POST /predict
Content-Type: application/json
```

### Request Payload
```json
{
  "transcript": "I have three midterms next week and my manager just scheduled an emergency weekend shift. I cannot sleep."
}
```

### Required Response Payload
```json
{
  "stress_score": 0.842,
  "confidence": 0.915
}
```

### Key Requirements
1. **`stress_score` (float in $[0.0, 1.0]$)**:
   - This must be the **calibrated probability** of the positive stress class, computed via Softmax or Sigmoid over your DistilBERT classification head:
     $$P(\text{stress} = 1 \mid x) = \frac{1}{1 + e^{-(z_{\text{stressed}} - z_{\text{unstressed}})}}$$
   - Please do not send hardcoded binary integers `0` or `1`. Person B's downstream trend and severity engines rely on continuous gradients (e.g. $0.51$ vs $0.85$).
2. **`confidence` (float in $[0.5, 1.0]$)**:
   - The probability of the predicted class: $\max(P(\text{unstressed}), P(\text{stressed}))$.
3. **Latency**:
   - Keep inference latency under $500\text{ ms}$ on CPU/GPU to maintain responsive audio diary ingestion.

---

## 3. How Person B Connects to Your Live Model

Once your FastAPI / Flask endpoint is running:

1. Open `backend/.env` (or copy from `.env.example`).
2. Set your server's address:
   ```env
   MODEL_API_URL=http://localhost:8001/predict
   USE_MOCK_MODEL=false
   ```
3. That is all. Person B's `model_client.py` will route all transcribed user diaries to your model.

---

## 4. Domain Shift Validation Test

Because your model was trained on Reddit text (Dreaddit) but will be evaluated on spoken diary transcripts, Person B has built an automated domain-shift evaluation harness:

```bash
# Run this from the backend folder with your model live:
python domain_shift_validation.py
```

- Tests 20 hand-labeled spoken-audio diary style samples (10 stressed / 10 unstressed).
- Reports:
  - **Accuracy** (target: $\ge 80\%$)
  - **False Positive Rate** (crucial: non-stressed complaints shouldn't falsely trigger high severity)
  - **False Negative Rate** (crucial: genuine distress must be caught)

If you have questions or field name differences (e.g., `stressScore` vs `stress_score`), inform Person B and it can be normalized inside `app/model_client.py:_normalize()`.
