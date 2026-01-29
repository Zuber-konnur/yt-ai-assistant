import re
from fastapi import APIRouter
from app.schemas.request import CommandRequest
from app.core.intent_model import predict_intent, CONFIDENCE_THRESHOLD
from app.core.rules import rule_based_fallback
from app.core.yt_resolver import get_video_id
from app.core.responses import response_for

router = APIRouter()

# Intents that should bypass ML or trigger fallback if confidence is low
DIRECTIONAL_INTENTS = {
    "scroll_up", "scroll_down",
    "volume_up", "volume_down",
    "home", "back"
}

@router.post("/command")
def process_command(req: CommandRequest):
    # Context and session cleanup removed to maintain stateless behavior
    
    text = req.command.lower().strip()
    print("Processing Command:", text)
    
    # Predict intent using the trained model
    intent, confidence = predict_intent(text)

    # -------- DIRECTIONAL & LOW CONFIDENCE OVERRIDE --------
    # Use rule-based fallback for specific intents or when ML is uncertain
    if intent in DIRECTIONAL_INTENTS or confidence < CONFIDENCE_THRESHOLD:
        intent = rule_based_fallback(text)

    query = None
    video_id = None
    value = None

    # -------- PLAY / SEARCH LOGIC --------
    if intent == "play":
        query = re.sub(r"(play|search|find)", "", text).strip()
        if not query:
            return {
                "intent": "clarify",
                "response": "What do you want me to play?"
            }
        video_id = get_video_id(query) # Resolves query to a YouTube ID

    elif intent == "search":
        query = re.sub(r"(search|find)", "", text).strip()

    # -------- NUMBER EXTRACTION --------
    # Extracts numeric values for commands like "skip 30 seconds"
    match = re.search(r"(\d+)", text)
    if match:
        value = int(match.group(1))

    # Construct the final result for the Chrome extension
    result = {
        "intent": intent,
        "confidence": round(confidence, 2),
        "query": query,
        "video_id": video_id,
        "value": value,
        "response": response_for(intent, query) # Generates spoken feedback
    }

    print("Intent Result:", result)
    return result