"""
main.py

FastAPI app. Run with:
    uvicorn app.main:app --reload --port 8000

Endpoints:
    POST /entries/audio        upload an audio file -> transcribe -> predict -> store
    POST /entries/text         submit transcript text directly -> predict -> store
    GET  /users/{user_id}/entries   raw stored entries for a user
    GET  /users/{user_id}/threads   stressor threads with trend + severity per thread
    GET  /users/{user_id}/report    full anonymized report (Part 6)
    GET  /users/{user_id}/therapists/{category}   matched therapists for a category
    GET  /health                basic liveness check
"""

import os
import shutil
import tempfile

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from typing import Optional

from app import database, pipeline, report as report_module
from app.threading_logic import build_threads
from app.trends import compute_trend, compute_time_decay_stress
from app.severity import severity_for_thread
from app.matching import match_therapists
from app.schemas import EntryOut, ThreadOut, ReportOut, TherapistOut, TextEntryIn

app = FastAPI(title="Stress Tracking Backend")

# Wide open for hackathon dev; tighten before anything resembling production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


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


@app.get("/users/{user_id}/entries", response_model=list[EntryOut])
def list_entries(user_id: str):
    return database.get_entries_for_user(user_id)


@app.get("/users/{user_id}/threads", response_model=list[ThreadOut])
def list_threads(user_id: str):
    entries = database.get_entries_for_user(user_id)
    if not entries:
        return []

    # similarity_fn=None here -> pure category threading. Swap in Person C's
    # is_same_stressor function once it's ready (see report.py for the same hook).
    threads = build_threads(entries, similarity_fn=None)
    num_active_stressors = len(threads)

    out = []
    for category, thread_entries in threads.items():
        trend = compute_trend(thread_entries)
        severity = severity_for_thread(thread_entries, trend, num_active_stressors)
        latest_score = sorted(thread_entries, key=lambda e: e["date"])[-1]["stress_score"]
        current_decay_score = compute_time_decay_stress(thread_entries)
        out.append({
            "category": category,
            "trend": trend,
            "severity": severity,
            "entry_count": len(thread_entries),
            "latest_score": latest_score,
            "current_decay_score": current_decay_score,
            "active_stressor_count": num_active_stressors,
        })
    return out


@app.get("/users/{user_id}/report", response_model=ReportOut)
def get_report(user_id: str, period: str = "last 14 days"):
    return report_module.build_report(user_id, period_label=period, similarity_fn=None)


@app.get("/users/{user_id}/therapists/{category}", response_model=list[TherapistOut])
def get_therapists(
    user_id: str,
    category: str,
    preferred_mode: str = "any",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    max_distance_km: float = 50.0,
):
    """Returns matched therapists for a stressor category.
    Takes into account user severity, consultation mode (online, offline, any),
    and user coordinates (lat, lng) to filter by radius and rank by proximity.
    """
    report = report_module.build_report(user_id)
    severity = report["overall_severity"]
    return match_therapists(
        top_category=category,
        severity=severity,
        preferred_mode=preferred_mode,
        user_lat=lat,
        user_lng=lng,
        max_distance_km=max_distance_km,
    )


@app.delete("/users/{user_id}/entries")
def delete_user_data(user_id: str):
    """Right-to-delete. Permanently removes every entry for this user,
    including raw transcripts. Irreversible — there is no soft-delete here
    on purpose, to keep the privacy guarantee simple and honest."""
    deleted = database.delete_entries_for_user(user_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="No data found for this user_id")
    return {"user_id": user_id, "entries_deleted": deleted}


@app.get("/admin/users")
def list_users():
    """Debug/demo helper — NOT meant to be exposed in a real deployment
    without auth. Lists every user_id currently in the DB, useful for
    checking what test data exists without opening a DB browser."""
    return {"user_ids": database.get_all_user_ids()}
