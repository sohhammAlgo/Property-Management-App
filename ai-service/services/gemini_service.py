import json
import re
import google.generativeai as genai
from config import get_settings

settings = get_settings()

gemini_model = None
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')


async def chat_with_gemini(message: str, history: list, context: dict) -> dict:
    """Use Gemini for complex conversational responses."""
    if not gemini_model:
        return {"reply": "AI assistant is currently unavailable.", "intent": None}

    context_str = ""
    if context:
        parts = [
            f"User Name: {context.get('userName', 'Resident')}",
            f"Society: {context.get('societyName', 'Your Society')}",
        ]
        if context.get('openComplaints') is not None:
            parts.append(f"Open Complaints: {context['openComplaints']}")
        if context.get('pendingPayments') is not None:
            parts.append(f"Pending Payments: {context['pendingPayments']}")
        context_str = "\n".join(parts)

    system_prompt = f"""You are a helpful assistant for Society Hub, a residential society management platform.
    
User Context:
{context_str}

Help users with complaints, payments, bookings, and general FAQs. Be concise and friendly."""

    # Build Gemini chat history
    gemini_history = []
    for msg in history[-8:]:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    chat = gemini_model.start_chat(history=gemini_history)
    response = chat.send_message(f"{system_prompt}\n\nUser: {message}")

    return {"reply": response.text.strip(), "intent": None}


async def generate_insights_gemini(data: dict) -> list:
    """Use Gemini to generate detailed analytics insights."""
    if not gemini_model:
        return []

    prompt = f"""Analyze this residential society management data and provide 3 actionable insights for the admin.

Data: {json.dumps(data, indent=2)}

Return as JSON array:
[{{"title": "...", "description": "...", "trend": "up|down|stable", "action": "..."}}]

Be specific, data-driven, and actionable."""

    response = gemini_model.generate_content(prompt)
    text = response.text.strip()

    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return []
