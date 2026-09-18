# Breadcrumbs — Comprehensive Project Overview & System Architecture

> **A gentle, privacy-first mental health decompression companion with clinical intelligence triage.**

---

## 1. Executive Summary

**Breadcrumbs** bridges the gap between daily emotional decompression and professional mental health support. The platform is designed around a strict dual-sided architecture:

1. **Patient Experience (Zero Clinical Pressure)**:
   - A warm, calming space for daily voice or text check-ins.
   - **No clinical scores, numbers, or anxiety-inducing severity graphs are ever exposed to the patient.**
   - Context-aware practitioner recommendations matched to the user's specific life stressors and care preferences.
   - Immediate crisis safety nets (e.g., 988 Suicide & Crisis Lifeline) when acute distress is detected.
2. **Therapist Portal (Clinical Intelligence Workspace)**:
   - A secure triage dashboard for licensed clinicians.
   - Longitudinal stress trend tracking powered by an **exponential time-decay algorithm**.
   - NLP-extracted triggers, category-specific stressors, and anonymized clinical reports.

---

## 2. System Architecture & AI Pipeline

```
                                [ Patient Reflection ]
                             (Voice WebM / Text Journal)
                                         │
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │       Local Speech Transcription          │
                   │      (OpenAI Whisper 'base' - Free/Offline)│
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │        NLP & Stress Classification        │
                   │  • Fine-tuned DistilBERT (F1: 0.804)      │
                   │  • VADER Linguistic Intensity Fusion      │
                   │  • Local Ollama (llama3.2:1b) Reason Extr.│
                   │  • Rule-Based Acute Crisis Override       │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                   ┌───────────────────────────────────────────┐
                   │     Temporal Decay & Threading Engine     │
                   │  • Exponential Weighting: exp(-0.099*days)│
                   │  • Multi-factor Stressor Threading        │
                   │  • Linear Regression Trend Slopes         │
                   └─────────────────────┬─────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌───────────────────────────┐               ┌───────────────────────────┐
      │     Patient Dashboard     │               │     Therapist Portal      │
      │ • Plain-language check-in │               │ • Full Clinical Reports   │
      │ • Matched Care Finder     │               │ • 7-Day Decay Scores      │
      │ • 988 Emergency Dialing   │               │ • Triage Severity Badges  │
      └───────────────────────────┘               └───────────────────────────┘
```

---

## 3. Core Technical Pillars

### 3.1. 100% Free & Offline Inference Pipeline
- **Speech-to-Text**: Local `openai-whisper` (`base` model) lazy-loaded on demand. No cloud latency or paid API dependencies.
- **Stress Classification**: Fine-tuned `DistilBERT` binary classifier trained on the Dreaddit dataset (Accuracy: 77.8%, Recall: 88.3%, F1: 0.804) fused with VADER sentiment intensity scoring.
- **Reason & Trigger Extraction**: Runs locally via `Ollama` (`llama3.2:1b`) with a zero-cost keyword fallback.

### 3.2. Exponential Time-Decay Stress Engine
Stress that occurred 10 days ago should not carry the same clinical weight as acute stress experienced today. 
The system models temporal decay using a half-life of 7 days:
- Decay constant: lambda = ln(2) / 7 ≈ 0.099
- Weight(t) = exp(-lambda * delta_days)
- Fused Decay Score = sum(weight_i * score_i) / sum(weight_i)

### 3.3. Compassionate Care Matching Engine
When a patient seeks care, the backend matches them with practitioners based on:
1. **Stress Category Specialty Match** (Work/Career, Academics, Relationship, Family, Health, Finances, Self-esteem/Identity)
2. **Clinical Severity Tier Triage** (Standard vs. Intensive)
3. **Format Compatibility** (Video / Voice Only / Text Chat / In-Person)
4. **Therapist Gender Preferences** (Any / Female / Male / Non-binary)
5. **Sliding Scale Priority** (Income-flexible opening filter)
6. **Insurance In-Network Verification** (BlueCross, Aetna, Out-of-network)
7. **Geodesic Proximity** (Calculated using the Haversine distance formula)

---

## 4. Current Implementation Status

### Completed Modules
- **FastAPI Backend (`backend/app/`)**:
  - Full CRUD and pipeline processing for audio/text entries.
  - Multi-criteria therapist ranking algorithm with query filters (`matching.py`).
  - Role-based accounts (`patient` vs `therapist`) and therapist-patient relationship linking (`database.py`).
  - Complete test suite passing 32/32 tests (`pytest test_logic.py`).
- **Frontend App (`frontend/src/`)**:
  - **`HeroScreen`**: Gentle voice recording and text reflection submission with mascot animations.
  - **`FindCarePage`**: Full 2-column layout with real-time preference filters, practitioner cards, verified badges, 15-min intro booking, full profile modals, and 988 crisis handler.
  - **`AuthModal`**: Account creation and role switching.
  - **`ProfileModal`**: Persona switcher and GDPR-compliant Right-to-Delete data eraser.
  - **`CalendarModal`**: Reflection timeline.
  - **`TherapistPortalModal`**: Clinician triage dashboard with 7-day decay scores and severity badges.

### Remaining Milestones
- [ ] Connect full longitudinal graphs to `ReportModal` inside the therapist workspace.
- [ ] Add therapist profile editing form (`POST /therapists/{tid}/profile`).
- [ ] Persist active user sessions in browser `localStorage`.
- [ ] Add live audio frequency waveform visualizer during recording.

---

## 5. How to Run and Verify the System

### Step 1: Start Backend (Port 8000)
```powershell
cd c:\Breadcrumbs-\backend
python -m uvicorn app.main:app --reload --port 8000
```
- Swagger API Docs: `http://127.0.0.1:8000/docs`

### Step 2: Start Frontend (Port 5173)
```powershell
cd c:\Breadcrumbs-\frontend
npm run dev
```
- Web Application: `http://localhost:5173`

### Step 3: Run Automated Test Suites
```powershell
# Backend logic tests (32 unit tests)
cd c:\Breadcrumbs-\backend
python -m pytest test_logic.py -v

# Frontend production build verification
cd c:\Breadcrumbs-\frontend
npm run build
```
