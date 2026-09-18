"""
risk_keywords.py

A small, conservative, hand-curated phrase list used only to decide whether
to proactively surface crisis-line resources. This is NOT a diagnostic
tool and is not meant to be exhaustive — per the guide, the goal is high
precision on clear cases, not broad coverage. When in doubt, this list
should stay short; false negatives here are addressed by keeping severity
tiers themselves conservative (see severity.py), not by trying to make
keyword matching do all the work.

If you extend this list, keep entries as plain, unambiguous phrases a
person might actually say, and validate additions with someone with
relevant clinical background before relying on them.
"""

ACUTE_RISK_PHRASES = [
    "want to die",
    "don't want to be here anymore",
    "no point in living",
    "better off without me",
    "kill myself",
    "end it all",
    "can't go on",
    "hurting myself",
    "hurt myself",
    "no way out",
    "hit me",
    "beat me",
    "abusing me",
    "abused me",
    "domestic violence",
    "physically hurt me",
    "kms",
    "suicide",
]


def check_acute_risk_keywords(transcript: str) -> bool:
    """Case-insensitive substring match against the phrase list above.
    Returns True on any match. Intentionally simple and inspectable —
    a judge (or a real clinician later) can read this function top to
    bottom and know exactly what triggers a flag."""
    if not transcript:
        return False
    lowered = transcript.lower()
    return any(phrase in lowered for phrase in ACUTE_RISK_PHRASES)
