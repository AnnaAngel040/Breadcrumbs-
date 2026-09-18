"""
schemas.py

Pydantic models for API request/response bodies. Keeping these separate from
database.py's plain dicts so the API contract is explicit and typed.
"""

from typing import Optional
from pydantic import BaseModel, Field


class TextEntryIn(BaseModel):
    """For submitting an entry directly as text (testing, or if C's frontend
    ever supports typed entries instead of only audio)."""
    user_id: str
    transcript: str = Field(..., min_length=1)


class EntryOut(BaseModel):
    entry_id: str
    user_id: str
    date: str
    transcript: str
    category: str
    stress_score: float
    confidence: float
    similarity_group_id: Optional[str] = None


class ThreadOut(BaseModel):
    category: str
    trend: str
    severity: str
    entry_count: int
    latest_score: float
    active_stressor_count: int


class ReportOut(BaseModel):
    anonymous_id: str
    period: str
    stressors: list[ThreadOut]
    overall_severity: str
    crisis_resources_shown: bool


class TherapistOut(BaseModel):
    name: str
    specialty: str
    tier: str
