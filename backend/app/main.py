"""
main.py

FastAPI app.  Run with:
    uvicorn app.main:app --reload --port 8000

Patient endpoints:
  POST /accounts                                    register patient or therapist
  GET  /accounts/{user_id}                          account info
  POST /entries/audio                               audio diary -> transcribe -> analyse -> store
  POST /entries/text                                text diary entry
  GET  /users/{user_id}/overview                    gentle wellness check-in (NO clinical scores)
  GET  /users/{user_id}/therapists/{category}       matched therapist list
  DELETE /users/{user_id}/entries                   right-to-delete

Therapist portal:
  POST /therapists/{therapist_id}/profile
  GET  /therapists/{therapist_id}/profile
  POST /therapists/{therapist_id}/patients/{patient_id}
  GET  /therapists/{therapist_id}/patients
  GET  /therapists/{therapist_id}/patients/{patient_id}/report
  GET  /therapists/{therapist_id}/patients/{patient_id}/entries

Debug / Admin (no role check):
  GET  /users/{user_id}/report
  GET  /users/{user_id}/entries
  GET  /users/{user_id}/threads
  GET  /admin/users
  GET  /health
"""

import os
import shutil
import tempfile

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app import database, pipeline, report as report_module
from app.threading_logic import build_threads
from app.trends import compute_trend, compute_time_decay_stress
from app.severity import severity_for_thread
from app.matching import match_therapists
from app.schemas import (
    EntryOut, ThreadOut, ReportOut, TherapistOut, TextEntryIn,
    PatientOverviewOut, PatientSummaryOut,
    CreateAccountIn, AccountOut,
    TherapistProfileIn, TherapistProfileOut,
)

app = FastAPI(title="Breadcrumbs - Stress Tracking Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()


# --- Health -------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# --- Account registration (patients + therapists) ----------------------------

@app.post("/accounts", response_model=AccountOut, status_code=201)
def register_account(payload: CreateAccountIn):
    """
    Create a new account.
    role="patient"   -> diary user; gets /overview endpoint
    role="therapist" -> professional; must also POST /therapists/{id}/profile
    """
    existing = database.get_account(payload.user_id)
    if existing:
        raise HTTPException(status_code=409, detail="user_id already registered")
    return database.create_account(
        user_id=payload.user_id,
        display_name=payload.display_name,
        role=payload.role,
        email=payload.email,
    )


@app.get("/accounts/{user_id}", response_model=AccountOut)
def get_account(user_id: str):
    acc = database.get_account(user_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc


# --- Diary entry ingestion ----------------------------------------------------

@app.post("/entries/audio", response_model=EntryOut)
async def create_audio_entry(user_id: str = Form(...), audio: UploadFile = File(...)):
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name
    try:
        entry = pipeline.process_audio_entry(user_id, tmp_path)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pipeline failed: {e}")
    finally:
        os.remove(tmp_path)
    return entry


@app.post("/entries/text", response_model=EntryOut)
def create_text_entry(payload: TextEntryIn):
    try:
        entry = pipeline.process_text_entry(payload.user_id, payload.transcript)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Pipeline failed: {e}")
    return entry


# --- Patient-facing views (no clinical labels) --------------------------------

@app.get("/users/{user_id}/overview", response_model=PatientOverviewOut)
def get_patient_overview(user_id: str):
    """
    Gentle wellness check-in for the patient dashboard.
    Returns plain-language labels only - no raw scores or clinical severity.
    If show_crisis_resources=true the frontend MUST surface hotline numbers immediately.
    """
    return report_module.build_patient_overview(user_id)


@app.get("/users/{user_id}/therapists/{category}", response_model=list[TherapistOut])
def get_therapists(
    user_id: str,
    category: str,
    preferred_mode: str = "any",
    gender: Optional[str] = None,
    sliding_scale: Optional[bool] = None,
    insurance: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    max_distance_km: float = 50.0,
):
    """
    Recommends therapists for a stressor category.
    Ranks by: specialty match -> mode -> gender -> sliding scale -> insurance -> Haversine proximity -> rating.
    No booking handled here - frontend shows contact details only.
    """
    report = report_module.build_report(user_id)
    severity = report["overall_severity"]
    return match_therapists(
        top_category=category,
        severity=severity,
        preferred_mode=preferred_mode,
        gender=gender,
        sliding_scale=sliding_scale,
        insurance=insurance,
        user_lat=lat,
        user_lng=lng,
        max_distance_km=max_distance_km,
    )



@app.delete("/users/{user_id}/entries")
def delete_user_data(user_id: str):
    """Right-to-delete: permanently removes all diary entries for this user."""
    deleted = database.delete_entries_for_user(user_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="No data found for this user_id")
    return {"user_id": user_id, "entries_deleted": deleted}


# --- Therapist portal helpers -------------------------------------------------

def _require_therapist(therapist_id: str) -> dict:
    acc = database.get_account(therapist_id)
    if not acc or acc["role"] != "therapist":
        raise HTTPException(
            status_code=403,
            detail="Not a registered therapist. Register via POST /accounts with role='therapist'.",
        )
    return acc


def _require_linked(therapist_id: str, patient_id: str) -> None:
    patients = database.get_patients_for_therapist(therapist_id)
    if patient_id not in {p["patient_id"] for p in patients}:
        raise HTTPException(status_code=403, detail="This patient is not linked to your account.")


# --- Therapist portal routes --------------------------------------------------

@app.post("/therapists/{therapist_id}/profile", response_model=TherapistProfileOut, status_code=201)
def create_therapist_profile(therapist_id: str, payload: TherapistProfileIn):
    """Therapist creates/updates their professional profile (specialty, location, modes)."""
    acc = _require_therapist(therapist_id)
    profile = database.upsert_therapist_profile(
        therapist_id=therapist_id,
        specialty=payload.specialty,
        tier=payload.tier,
        modes=payload.modes,
        address=payload.address,
        city=payload.city,
        lat=payload.lat,
        lng=payload.lng,
        rating=payload.rating,
    )
    profile["display_name"] = acc.get("display_name")
    return profile


@app.get("/therapists/{therapist_id}/profile", response_model=TherapistProfileOut)
def get_therapist_profile(therapist_id: str):
    profile = database.get_therapist_profile(therapist_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Therapist profile not found.")
    acc = database.get_account(therapist_id)
    profile["display_name"] = acc.get("display_name") if acc else None
    return profile


@app.post("/therapists/{therapist_id}/patients/{patient_id}", status_code=201)
def link_patient(therapist_id: str, patient_id: str):
    """
    Link a patient to a therapist, granting report access.
    In production this must be gated behind patient consent.
    For the demo, calling this endpoint acts as the consent confirmation.
    """
    _require_therapist(therapist_id)
    return database.link_therapist_patient(therapist_id, patient_id)


@app.get("/therapists/{therapist_id}/patients", response_model=list[PatientSummaryOut])
def list_patients(therapist_id: str):
    """Triage view: all linked patients with severity, decay score, stressor count."""
    _require_therapist(therapist_id)
    patients = database.get_patients_for_therapist(therapist_id)
    summaries = []
    for p in patients:
        pid = p["patient_id"]
        rep = report_module.build_report(pid)
        summaries.append({
            "patient_id": pid,
            "display_name": p.get("display_name"),
            "linked_at": p["linked_at"],
            "overall_severity": rep["overall_severity"],
            "overall_decay_score": rep.get("overall_decay_score"),
            "active_stressor_count": len(rep["stressors"]),
            "entry_count": sum(s["entry_count"] for s in rep["stressors"]),
        })
    return summaries


@app.get("/therapists/{therapist_id}/patients/{patient_id}/report", response_model=ReportOut)
def get_patient_full_report(therapist_id: str, patient_id: str, period: str = "last 14 days"):
    """
    Full clinical report (stress scores, trends, triggers, severity, decay scores).
    Accessible to the linked therapist ONLY. Patients cannot call this.
    """
    _require_therapist(therapist_id)
    _require_linked(therapist_id, patient_id)
    return report_module.build_report(patient_id, period_label=period, similarity_fn=None)


@app.get("/therapists/{therapist_id}/patients/{patient_id}/entries", response_model=list[EntryOut])
def get_patient_entries(therapist_id: str, patient_id: str):
    """Raw diary entries for a patient - therapist only."""
    _require_therapist(therapist_id)
    _require_linked(therapist_id, patient_id)
    return database.get_entries_for_user(patient_id)


# --- Debug / Admin (no role enforcement - dev only) --------------------------

@app.get("/users/{user_id}/report", response_model=ReportOut)
def get_report_debug(user_id: str, period: str = "last 14 days"):
    """Full report WITHOUT role check. FOR DEVELOPMENT/SWAGGER ONLY. Remove before production."""
    return report_module.build_report(user_id, period_label=period, similarity_fn=None)


@app.get("/users/{user_id}/entries", response_model=list[EntryOut])
def list_entries(user_id: str):
    return database.get_entries_for_user(user_id)


@app.get("/users/{user_id}/threads", response_model=list[ThreadOut])
def list_threads(user_id: str):
    entries = database.get_entries_for_user(user_id)
    if not entries:
        return []
    threads = build_threads(entries, similarity_fn=None)
    num_active = len(threads)
    out = []
    for category, thread_entries in threads.items():
        trend = compute_trend(thread_entries)
        severity = severity_for_thread(thread_entries, trend, num_active)
        sorted_thread = sorted(thread_entries, key=lambda e: e["date"])
        latest_entry = sorted_thread[-1]
        current_decay_score = compute_time_decay_stress(thread_entries)
        recent_triggers: list[str] = []
        for e in reversed(sorted_thread):
            r = e.get("reason")
            if r and r not in recent_triggers:
                recent_triggers.append(r)
            if len(recent_triggers) >= 3:
                break
        out.append({
            "category": category,
            "trend": trend,
            "severity": severity,
            "entry_count": len(thread_entries),
            "latest_score": latest_entry["stress_score"],
            "current_decay_score": current_decay_score,
            "active_stressor_count": num_active,
            "latest_reason": latest_entry.get("reason"),
            "recent_triggers": recent_triggers,
        })
    return out


@app.get("/admin/users")
def list_users():
    """Debug helper. Do not expose in production."""
    return {"user_ids": database.get_all_user_ids()}
