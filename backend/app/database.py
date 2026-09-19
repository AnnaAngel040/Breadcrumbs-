"""
database.py

Single-table SQLite persistence layer, per the guide: one `entries` table,
file-based, zero setup. No ORM — plain sqlite3 is plenty at this scale and
keeps the code easy to explain to a judge.
"""

import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

DB_PATH = os.getenv("DB_PATH", "./stress_app.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    entry_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    transcript TEXT,
    category TEXT NOT NULL,
    reason TEXT,
    stress_score REAL NOT NULL,
    confidence REAL NOT NULL,
    similarity_group_id TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient',   -- 'patient' or 'therapist'
    email TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS therapist_profiles (
    therapist_id TEXT PRIMARY KEY,          -- same as accounts.user_id
    specialty TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'standard',
    modes TEXT NOT NULL DEFAULT 'online',   -- comma-separated: 'online', 'offline'
    address TEXT,
    city TEXT,
    lat REAL,
    lng REAL,
    rating REAL DEFAULT 4.5
);

CREATE TABLE IF NOT EXISTS therapist_patient_links (
    therapist_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    linked_at TEXT NOT NULL,
    PRIMARY KEY (therapist_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_user ON entries (user_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_category ON entries (user_id, category);
CREATE INDEX IF NOT EXISTS idx_links_therapist ON therapist_patient_links (therapist_id);
CREATE INDEX IF NOT EXISTS idx_links_patient ON therapist_patient_links (patient_id);
"""


def init_db(db_path: str = DB_PATH) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)
        # Safe migration if table already exists without 'reason' column
        cursor = conn.execute("PRAGMA table_info(entries)")
        cols = [row[1] for row in cursor.fetchall()]
        if "reason" not in cols:
            conn.execute("ALTER TABLE entries ADD COLUMN reason TEXT")
        conn.commit()


@contextmanager
def get_conn(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def insert_entry(
    user_id: str,
    category: str,
    stress_score: float,
    confidence: float,
    transcript: Optional[str] = None,
    reason: Optional[str] = None,
    entry_date: Optional[str] = None,
    similarity_group_id: Optional[str] = None,
    db_path: str = DB_PATH,
) -> dict:
    entry_id = str(uuid.uuid4())
    entry_date = entry_date or datetime.now(timezone.utc).isoformat()

    with get_conn(db_path) as conn:
        conn.execute(
            """
            INSERT INTO entries
                (entry_id, user_id, date, transcript, category,
                 reason, stress_score, confidence, similarity_group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                user_id,
                entry_date,
                transcript or "",
                category,
                reason,
                stress_score,
                confidence,
                similarity_group_id,
            ),
        )
        conn.commit()

    return {
        "entry_id": entry_id,
        "user_id": user_id,
        "date": entry_date,
        "transcript": transcript,
        "category": category,
        "reason": reason,
        "stress_score": stress_score,
        "confidence": confidence,
        "similarity_group_id": similarity_group_id,
    }


def get_entries_for_user(user_id: str, db_path: str = DB_PATH) -> list[dict]:
    with get_conn(db_path) as conn:
        rows = conn.execute(
            "SELECT * FROM entries WHERE user_id = ? ORDER BY date ASC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def update_similarity_group(entry_id: str, group_id: str, db_path: str = DB_PATH) -> None:
    with get_conn(db_path) as conn:
        conn.execute(
            "UPDATE entries SET similarity_group_id = ? WHERE entry_id = ?",
            (group_id, entry_id),
        )
        conn.commit()


def delete_entries_for_user(user_id: str, db_path: str = DB_PATH) -> int:
    """Right-to-delete: permanently removes every entry (including raw
    transcripts) for a user. Returns the number of rows deleted."""
    with get_conn(db_path) as conn:
        cur = conn.execute("DELETE FROM entries WHERE user_id = ?", (user_id,))
        conn.commit()
        return cur.rowcount


def redact_transcripts_older_than(days: int, db_path: str = DB_PATH) -> int:
    """Privacy/retention sweep matching the guide's note: 'consider marking
    this for deletion/encryption post-processing.' Blanks out the raw
    transcript text for entries older than `days` while KEEPING category,
    stress_score, confidence and date intact — trends/severity/reports stay
    computable from historical data, but the raw text a person actually said
    doesn't sit in the DB indefinitely. Returns the number of rows redacted.

    Run this periodically (e.g. a daily cron/scheduled task) rather than
    per-request — it's a maintenance sweep, not something that needs to run
    on every API call.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    with get_conn(db_path) as conn:
        cur = conn.execute(
            """
            UPDATE entries
            SET transcript = '[redacted]'
            WHERE date < ? AND transcript != '[redacted]'
            """,
            (cutoff,),
        )
        conn.commit()
        return cur.rowcount


def get_all_user_ids(db_path: str = DB_PATH) -> list[str]:
    """Utility for admin/debug tooling — lists distinct users with data."""
    with get_conn(db_path) as conn:
        rows = conn.execute("SELECT DISTINCT user_id FROM entries").fetchall()
    return [r["user_id"] for r in rows]


# ─── Account management ──────────────────────────────────────────────────────

def create_account(
    user_id: str,
    display_name: str,
    role: str = "patient",
    email: Optional[str] = None,
    db_path: str = DB_PATH,
) -> dict:
    """Create a patient or therapist account. role must be 'patient' or 'therapist'."""
    if role not in ("patient", "therapist"):
        raise ValueError(f"Invalid role: {role!r}. Must be 'patient' or 'therapist'.")
    created_at = datetime.now(timezone.utc).isoformat()
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO accounts (user_id, display_name, role, email, created_at) VALUES (?,?,?,?,?)",
            (user_id, display_name, role, email, created_at),
        )
        conn.commit()
    return {"user_id": user_id, "display_name": display_name, "role": role, "email": email, "created_at": created_at}


def get_account(user_id: str, db_path: str = DB_PATH) -> Optional[dict]:
    with get_conn(db_path) as conn:
        row = conn.execute("SELECT * FROM accounts WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


# ─── Therapist profile management ────────────────────────────────────────────

def upsert_therapist_profile(
    therapist_id: str,
    specialty: str,
    tier: str = "standard",
    modes: list = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    rating: float = 4.5,
    db_path: str = DB_PATH,
) -> dict:
    modes_str = ",".join(modes or ["online"])
    with get_conn(db_path) as conn:
        conn.execute(
            """INSERT OR REPLACE INTO therapist_profiles
               (therapist_id, specialty, tier, modes, address, city, lat, lng, rating)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (therapist_id, specialty, tier, modes_str, address, city, lat, lng, rating),
        )
        conn.commit()
    return {"therapist_id": therapist_id, "specialty": specialty, "tier": tier,
            "modes": (modes or ["online"]), "address": address, "city": city,
            "lat": lat, "lng": lng, "rating": rating}


def get_therapist_profile(therapist_id: str, db_path: str = DB_PATH) -> Optional[dict]:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM therapist_profiles WHERE therapist_id = ?", (therapist_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["modes"] = [m.strip() for m in d["modes"].split(",")]
    return d


# ─── Therapist–Patient link management ───────────────────────────────────────

def link_therapist_patient(therapist_id: str, patient_id: str, db_path: str = DB_PATH) -> dict:
    linked_at = datetime.now(timezone.utc).isoformat()
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO therapist_patient_links (therapist_id, patient_id, linked_at) VALUES (?,?,?)",
            (therapist_id, patient_id, linked_at),
        )
        conn.commit()
    return {"therapist_id": therapist_id, "patient_id": patient_id, "linked_at": linked_at}


def get_patients_for_therapist(therapist_id: str, db_path: str = DB_PATH) -> list[dict]:
    """Returns all patients linked to a therapist, with their account display_name if available."""
    with get_conn(db_path) as conn:
        rows = conn.execute(
            """SELECT l.patient_id, l.linked_at, a.display_name, a.email
               FROM therapist_patient_links l
               LEFT JOIN accounts a ON l.patient_id = a.user_id
               WHERE l.therapist_id = ?
               ORDER BY l.linked_at ASC""",
            (therapist_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_therapist_for_patient(patient_id: str, db_path: str = DB_PATH) -> Optional[str]:
    """Returns the therapist_id linked to a patient (first one if multiple)."""
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT therapist_id FROM therapist_patient_links WHERE patient_id = ? LIMIT 1",
            (patient_id,),
        ).fetchone()
    return row["therapist_id"] if row else None

