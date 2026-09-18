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
    date TEXT NOT NULL,              -- ISO 8601 timestamp
    transcript TEXT NOT NULL,
    category TEXT NOT NULL,
    stress_score REAL NOT NULL,
    confidence REAL NOT NULL,
    similarity_group_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_user ON entries (user_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_category ON entries (user_id, category);
"""


def init_db(db_path: str = DB_PATH) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)
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
    transcript: str,
    category: str,
    stress_score: float,
    confidence: float,
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
                 stress_score, confidence, similarity_group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                user_id,
                entry_date,
                transcript,
                category,
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
