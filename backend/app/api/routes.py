import re
from fastapi import APIRouter
from app.schemas.request import CommandRequest
from app.core.intent_model import predict_intent, CONFIDENCE_THRESHOLD
from app.core.rules import rule_based_fallback
from app.core.yt_resolver import get_video_id
from app.core.responses import response_for

router = APIRouter()

DIRECTIONAL_INTENTS = {
    "scroll_up", "scroll_down",
    "volume_up", "volume_down",
    "home", "back"
}

@router.post("/command")
def process_command(req: CommandRequest):
    # Session cleanup and context retrieval removed
    
    text = req.command.lower().strip()
    print("Processing Command:", text)
    
    intent, confidence = predict_intent(text)

    # -------- DIRECTIONAL OVERRIDE --------
    if intent in DIRECTIONAL_INTENTS or confidence < CONFIDENCE_THRESHOLD:
        intent = rule_based_fallback(text)

    query = None
    video_id = None
    value = None

    # -------- PLAY / SEARCH --------
    if intent == "play":
        query = re.sub(r"(play|search|find)", "", text).strip()
        if not query:
            return {
                "intent": "clarify",
                "response": "What do you want me to play?"
            }
        video_id = get_video_id(query)

    elif intent == "search":
        query = re.sub(r"(search|find)", "", text).strip()

    # -------- NUMBER EXTRACTION --------
    match = re.search(r"(\d+)", text)
    if match:
        value = int(match.group(1))

    # The result is now determined purely by the current command
    result = {
        "intent": intent,
        "confidence": round(confidence, 2),
        "query": query,
        "video_id": video_id,
        "value": value,
        "response": response_for(intent, query)
    }

    print("Intent Result:", result)
    return result