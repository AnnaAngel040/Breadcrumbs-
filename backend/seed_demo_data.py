"""
seed_demo_data.py

Populates the DB with realistic multi-day data for 3 demo users, each
illustrating a different path through the system:

    demo_escalating  -> Work/Career thread trending "escalating",
                        eventually crossing into "high" severity
    demo_improving   -> Family thread trending "improving", stays "low"
    demo_flagged     -> one entry containing acute-risk language,
                        forces "flagged" severity + crisis resources

Run from the backend/ folder, with the venv active:

    python seed_demo_data.py

Safe to re-run — it just inserts more rows (doesn't dedupe), so if you
want a clean slate first, delete stress_app.db and it'll be recreated
automatically on next run.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

# Make sure `app` is importable when run as a plain script from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import database

DB_PATH = os.getenv("DB_PATH", "./stress_app.db")


def days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()


def seed():
    database.init_db(DB_PATH)

    # --- demo_escalating: Work/Career stress climbing over 2 weeks ---
    escalating_entries = [
        (13, "Work/Career", 0.35, 0.80, "Work is fine, just a normal amount of deadlines."),
        (10, "Work/Career", 0.45, 0.78, "A bit more pressure this week with the new project."),
        (7,  "Work/Career", 0.58, 0.82, "My manager keeps piling on deadlines, feeling stretched thin."),
        (4,  "Work/Career", 0.71, 0.85, "Barely sleeping, work has been completely overwhelming."),
        (1,  "Work/Career", 0.83, 0.88, "I can't keep up anymore, every day feels like drowning at work."),
    ]
    for day, category, score, conf, text in escalating_entries:
        database.insert_entry(
            user_id="demo_escalating",
            transcript=text,
            category=category,
            stress_score=score,
            confidence=conf,
            entry_date=days_ago(day),
            db_path=DB_PATH,
        )
    # second active stressor so this user clears the "3 active stressors" bar for "high"
    database.insert_entry(
        user_id="demo_escalating", transcript="Finances have been tight this month too.",
        category="Finances", stress_score=0.6, confidence=0.7,
        entry_date=days_ago(5), db_path=DB_PATH,
    )
    database.insert_entry(
        user_id="demo_escalating", transcript="Still stressed about money on top of everything else.",
        category="Finances", stress_score=0.62, confidence=0.72,
        entry_date=days_ago(2), db_path=DB_PATH,
    )
    database.insert_entry(
        user_id="demo_escalating", transcript="Sleep has been rough, health feels affected too.",
        category="Health", stress_score=0.55, confidence=0.7,
        entry_date=days_ago(1), db_path=DB_PATH,
    )

    # --- demo_improving: Family stress easing over 2 weeks ---
    improving_entries = [
        (12, "Family", 0.68, 0.80, "Things with my family have been really tense lately."),
        (9,  "Family", 0.60, 0.79, "A difficult conversation with my parents this week."),
        (6,  "Family", 0.45, 0.81, "We talked things through, feeling a bit lighter."),
        (3,  "Family", 0.32, 0.83, "Family dinner went well, things are looking up."),
        (1,  "Family", 0.25, 0.85, "Feeling much better about things at home now."),
    ]
    for day, category, score, conf, text in improving_entries:
        database.insert_entry(
            user_id="demo_improving",
            transcript=text,
            category=category,
            stress_score=score,
            confidence=conf,
            entry_date=days_ago(day),
            db_path=DB_PATH,
        )

    # --- demo_flagged: acute-risk language should force severity="flagged" ---
    flagged_entries = [
        (5, "Academic", 0.70, 0.80, "Exams have been really overwhelming, barely sleeping."),
        (2, "Academic", 0.78, 0.82, "Still so much pressure, can't catch a break."),
        (0, "Academic", 0.85, 0.84, "I don't want to be here anymore, nothing feels worth it."),
    ]
    for day, category, score, conf, text in flagged_entries:
        database.insert_entry(
            user_id="demo_flagged",
            transcript=text,
            category=category,
            stress_score=score,
            confidence=conf,
            entry_date=days_ago(day),
            db_path=DB_PATH,
        )

    print("Seeded 3 demo users into", DB_PATH)
    print("  demo_escalating  -> GET /users/demo_escalating/report   (expect severity: high)")
    print("  demo_improving   -> GET /users/demo_improving/report    (expect severity: low, trend: improving)")
    print("  demo_flagged     -> GET /users/demo_flagged/report      (expect severity: flagged, crisis_resources_shown: true)")


if __name__ == "__main__":
    seed()
