import re
from fastapi import APIRouter
from app.schemas.request import CommandRequest
from app.core.intent_model import predict_intent, CONFIDENCE_THRESHOLD
from app.core.rules import rule_based_fallback
from app.core.yt_resolver import get_video_id
from app.core.responses import response_for

router = APIRouter()

# Intents handled primarily by rules or manual keyword matching
DIRECTIONAL_INTENTS = {"scroll_up", "scroll_down", "volume_up", "volume_down", "home", "back"}

@router.post("/command")
def process_command(req: CommandRequest):
    text = req.command.lower().strip()
    print(f"Processing: {text}")

    # 1. Intent Classification
    intent, confidence = predict_intent(text)

    # 2. Fallback check
    if intent in DIRECTIONAL_INTENTS or confidence < CONFIDENCE_THRESHOLD:
        intent = rule_based_fallback(text)

    # 3. Data Extraction
    query = None
    video_id = None
    value = None

    if intent == "play":
        query = re.sub(r"(play|search|find)", "", text).strip()
        if query:
            video_id = get_video_id(query)
    elif intent == "search":
        query = re.sub(r"(search|find)", "", text).strip()

    # Numeric extraction (e.g., skip 30)
    match = re.search(r"(\d+)", text)
    if match:
        value = int(match.group(1))

    result = {
        "intent": intent,
        # "confidence": round(confidence, 2),
        "query": query,
        "video_id": video_id,
        "value": value,
        "response": response_for(intent, query) # Generates spoken feedback
    }

    print("Intent Result:", result)

    return {
        "intent": intent,
        "query": query,
        "video_id": video_id,
        "value": value,
        "response": response_for(intent, query)
    }