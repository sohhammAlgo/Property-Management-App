from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ── Complaint Classification ──

class ComplaintClassifyRequest(BaseModel):
    description: str = Field(..., min_length=5, max_length=2000)


class ComplaintClassifyResponse(BaseModel):
    category: str
    priority: str
    summary: Optional[str] = None
    suggested_department: Optional[str] = None
    confidence: Optional[float] = None


# ── Chatbot ──

class ConversationMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: List[ConversationMessage] = Field(default=[])
    context: Optional[Dict[str, Any]] = Field(default={})


class ChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = None
    suggested_actions: Optional[List[str]] = None


# ── Dashboard Insights ──

class ComplaintData(BaseModel):
    total: int = 0
    open: int = 0
    resolved: int = 0
    high_priority: int = 0
    this_month: int = 0
    last_month: int = 0


class PaymentData(BaseModel):
    total_revenue: Optional[float] = 0
    this_month_revenue: Optional[float] = 0
    pending_payments: int = 0


class BookingData(BaseModel):
    total: int = 0
    approved: int = 0
    this_month: int = 0


class InsightsData(BaseModel):
    complaints: Optional[ComplaintData] = None
    payments: Optional[PaymentData] = None
    bookings: Optional[BookingData] = None


class InsightsRequest(BaseModel):
    data: InsightsData


class InsightItem(BaseModel):
    title: str
    description: str
    trend: Optional[str] = None  # "up" | "down" | "stable"
    action: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
