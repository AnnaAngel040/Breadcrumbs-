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
    transcript: Optional[str] = None
    category: str
    reason: Optional[str] = None
    stress_score: float
    confidence: float
    similarity_group_id: Optional[str] = None
    is_flagged: Optional[bool] = False
    show_crisis_resources: Optional[bool] = False
    is_stressor: Optional[bool] = False


class ThreadOut(BaseModel):
    category: str
    trend: str
    severity: str
    entry_count: int
    latest_score: float
    current_decay_score: Optional[float] = None
    active_stressor_count: int
    latest_reason: Optional[str] = None
    recent_triggers: list[str] = []


class ReportOut(BaseModel):
    """Full clinical report — returned only to verified therapists."""
    anonymous_id: str
    period: str
    stressors: list[ThreadOut]
    overall_severity: str
    overall_decay_score: Optional[float] = None
    crisis_resources_shown: bool


class PatientOverviewOut(BaseModel):
    """Gentle, non-clinical summary shown to the patient on their own dashboard.
    No raw scores, no severity labels — just a human-readable wellness check-in."""
    user_id: str
    wellbeing_label: str            # e.g. "You seem stressed today", "Things look steady"
    active_area_count: int          # how many life areas have recent entries
    primary_area: Optional[str]     # top stressor category name
    trend_summary: str              # e.g. "Stress has been building over the past week"
    show_crisis_resources: bool     # True only when flagged — must be shown prominently
    entry_count_last_14_days: int


class TherapistOut(BaseModel):
    id: Optional[str] = None
    name: str
    specialty: str
    tier: str
    modes: list[str] = ["online"]
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    distance_km: Optional[float] = None
    match_score: Optional[float] = None
    rating: Optional[float] = None
    title: Optional[str] = None
    review_count: Optional[str] = None
    next_available: Optional[str] = None
    price: Optional[str] = None
    gender: Optional[str] = None
    insurances: list[str] = []
    sliding_scale: bool = False
    avatar_url: Optional[str] = None
    match_percentage: Optional[int] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None



# ─── Account schemas ──────────────────────────────────────────────────────────

class CreateAccountIn(BaseModel):
    user_id: str = Field(..., min_length=3)
    display_name: str = Field(..., min_length=1)
    role: str = Field("patient", pattern="^(patient|therapist)$")
    email: Optional[str] = None


class AccountOut(BaseModel):
    user_id: str
    display_name: str
    role: str
    email: Optional[str] = None
    created_at: str


class TherapistProfileIn(BaseModel):
    specialty: str
    tier: str = "standard"
    modes: list[str] = ["online"]
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: float = 4.5


class TherapistProfileOut(BaseModel):
    therapist_id: str
    display_name: Optional[str] = None
    specialty: str
    tier: str
    modes: list[str]
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: float


class PatientSummaryOut(BaseModel):
    """Compact patient summary shown in a therapist's patient list."""
    patient_id: str
    display_name: Optional[str] = None
    linked_at: str
    overall_severity: Optional[str] = None
    overall_decay_score: Optional[float] = None
    active_stressor_count: int = 0
    entry_count: int = 0


