import json
from fastapi import APIRouter, HTTPException
from models.schemas import (
    ComplaintClassifyRequest, ComplaintClassifyResponse,
    ChatRequest, ChatResponse,
    InsightsRequest, InsightsResponse, InsightItem,
)
from services.groq_service import classify_complaint, chat_with_groq, generate_insights_groq
from services.gemini_service import chat_with_gemini, generate_insights_gemini
from config import get_settings

router = APIRouter(prefix="/ai", tags=["AI"])
settings = get_settings()


@router.post("/classify-complaint", response_model=ComplaintClassifyResponse)
async def classify_complaint_endpoint(request: ComplaintClassifyRequest):
    """
    Classify a complaint using AI (Groq for fast inference).
    Returns category, priority, and summary.
    """
    try:
        result = await classify_complaint(request.description)
        return ComplaintClassifyResponse(
            category=result.get("category", "Other"),
            priority=result.get("priority", "medium"),
            summary=result.get("summary"),
            suggested_department=result.get("suggested_department"),
            confidence=result.get("confidence"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    AI chatbot conversation endpoint.
    Uses Groq for primary responses, falls back to Gemini.
    """
    try:
        history = [msg.model_dump() for msg in request.conversation_history]

        # Try Groq first (faster), then Gemini
        if settings.groq_api_key:
            result = await chat_with_groq(request.message, history, request.context or {})
        elif settings.gemini_api_key:
            result = await chat_with_gemini(request.message, history, request.context or {})
        else:
            result = {"reply": "AI service is not configured. Please contact support.", "intent": None}

        return ChatResponse(
            reply=result.get("reply", "I'm unable to respond right now."),
            intent=result.get("intent"),
            suggested_actions=result.get("suggested_actions"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/insights", response_model=InsightsResponse)
async def insights_endpoint(request: InsightsRequest):
    """
    Generate AI-powered dashboard insights.
    Uses Gemini for complex analysis, falls back to Groq.
    """
    try:
        data = request.data.model_dump()

        # Use Gemini for richer insights (better reasoning)
        if settings.gemini_api_key:
            raw_insights = await generate_insights_gemini(data)
        elif settings.groq_api_key:
            raw_insights = await generate_insights_groq(data)
        else:
            raw_insights = []

        insights = [
            InsightItem(
                title=item.get("title", "Insight"),
                description=item.get("description", ""),
                trend=item.get("trend"),
                action=item.get("action"),
            )
            for item in raw_insights
        ]

        return InsightsResponse(insights=insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")
