import json
import re
from groq import AsyncGroq
from config import get_settings

settings = get_settings()
groq_client = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None


CLASSIFICATION_PROMPT = """You are an expert complaint classification system for a residential society management platform.

Classify the following resident complaint into the appropriate category and priority.

Categories:
- Plumbing (water leaks, pipe issues, bathroom problems, drainage)
- Electrical (power outages, wiring issues, lighting problems, short circuits)
- Security (unauthorized access, broken locks, CCTV, gate issues, safety concerns)
- Cleaning (garbage, common area cleanliness, pest control, hygiene)
- Structural (cracks, roof leaks, wall damage, flooring)
- Elevator (lift not working, maintenance needed)
- Parking (unauthorized parking, damage, allocation issues)
- Noise (loud neighbors, construction noise, disturbance)
- Internet/TV (cable, broadband issues)
- Other (anything that doesn't fit above)

Priority:
- high (immediate safety/health risk, water/power outage affecting multiple units)
- medium (significant inconvenience, needs attention within 24-48 hours)
- low (minor issue, can be addressed within a week)

Return ONLY valid JSON with these exact keys:
{
  "category": "<category>",
  "priority": "<high|medium|low>",
  "summary": "<one sentence summary>",
  "suggested_department": "<department name>",
  "confidence": <0.0-1.0>
}

Complaint: "{complaint}"
"""

CHATBOT_SYSTEM_PROMPT = """You are an intelligent assistant for a residential society management platform called Society Hub.

You help residents and society admins with:
- Raising and tracking complaints (Plumbing, Electrical, Security, Cleaning, etc.)
- Checking and making maintenance fee payments
- Booking amenities (Gym, Clubhouse, Swimming Pool, Community Hall, Parking)
- Understanding announcements and notifications
- General FAQs about society management

Guidelines:
- Be friendly, professional, and concise
- Always address the user by name if provided in context
- For actions (raise complaint, make payment, book amenity), guide users to the correct section of the app
- If you cannot help with something, suggest contacting the society admin
- Keep responses under 150 words unless detailed explanation is needed
- Use bullet points for multi-step instructions

Context will be provided about the user's society, open complaints, and pending payments."""

INSIGHTS_PROMPT = """You are a data analyst for a residential society management platform.

Analyze the following society data and generate 2-3 actionable business insights for the society admin.

Data:
{data}

Return ONLY valid JSON array:
[
  {{
    "title": "<short title>",
    "description": "<2-3 sentence insight>",
    "trend": "<up|down|stable>",
    "action": "<recommended action>"
  }}
]

Focus on: complaint resolution rates, revenue collection, booking utilization, and operational efficiency."""


async def classify_complaint(description: str) -> dict:
    """Use Groq (fast inference) to classify a complaint."""
    if not groq_client:
        return {"category": "Other", "priority": "medium", "summary": description[:100], "confidence": 0.0}

    prompt = CLASSIFICATION_PROMPT.replace("{complaint}", description)

    chat_completion = await groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
        temperature=0.1,
        max_tokens=300,
    )

    response_text = chat_completion.choices[0].message.content.strip()

    # Extract JSON from response
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return {"category": "Other", "priority": "medium", "summary": description[:100]}


async def chat_with_groq(message: str, history: list, context: dict) -> dict:
    """Use Groq for fast chatbot responses."""
    if not groq_client:
        return {"reply": "I'm currently unavailable. Please contact your society admin.", "intent": None}

    # Build context string
    context_str = ""
    if context:
        parts = []
        if context.get("userName"): parts.append(f"User: {context['userName']}")
        if context.get("societyName"): parts.append(f"Society: {context['societyName']}")
        if context.get("openComplaints") is not None: parts.append(f"Open complaints: {context['openComplaints']}")
        if context.get("pendingPayments") is not None: parts.append(f"Pending payments: {context['pendingPayments']}")
        context_str = "\n".join(parts)

    messages = [
        {"role": "system", "content": CHATBOT_SYSTEM_PROMPT + (f"\n\nUser Context:\n{context_str}" if context_str else "")},
    ]

    # Add conversation history (last 10 messages)
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    completion = await groq_client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        max_tokens=400,
    )

    reply = completion.choices[0].message.content.strip()
    return {"reply": reply, "intent": None}


async def generate_insights_groq(data: dict) -> list:
    """Generate dashboard insights using Groq."""
    if not groq_client:
        return []

    prompt = INSIGHTS_PROMPT.format(data=json.dumps(data, indent=2))

    completion = await groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=600,
    )

    response_text = completion.choices[0].message.content.strip()

    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return []
