"""
run_retention_sweep.py

Standalone maintenance script implementing the guide's privacy note:
"consider marking this [transcript] for deletion/encryption post-processing."

Redacts raw transcript text for any entry older than N days, while keeping
category/stress_score/confidence/date intact — so historical trends and
reports stay fully computable, but raw spoken content doesn't accumulate
indefinitely in the DB.

Usage:
    python run_retention_sweep.py            # defaults to 30 days
    python run_retention_sweep.py --days 14
"""

import argparse
from app import database


def main():
    parser = argparse.ArgumentParser(description="Redact transcripts older than N days.")
    parser.add_argument("--days", type=int, default=30, help="Age threshold in days (default: 30)")
    args = parser.parse_args()

    database.init_db()
    redacted = database.redact_transcripts_older_than(args.days)
    print(f"Redacted {redacted} transcript(s) older than {args.days} days.")


if __name__ == "__main__":
    main()
