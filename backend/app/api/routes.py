import re
from fastapi import APIRouter
from app.schemas.request import CommandRequest
from app.core.intent_model import predict_intent, CONFIDENCE_THRESHOLD
from app.core.rules import rule_based_fallback
from app.core.context import get_context, cleanup_expired_sessions
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
    cleanup_expired_sessions()

    text = req.command.lower().strip()
    ctx = get_context(req.session_id)
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
        ctx["last_query"] = query
        ctx["last_video_id"] = video_id
        ctx["is_playing"] = True

    elif intent == "search":
        query = re.sub(r"(search|find)", "", text).strip()

    # -------- CONTEXTUAL RESUME --------
    # if intent == "resume" and not ctx["is_playing"]:
    #     return {
    #         "intent": "speak_only",
    #         "response": "There is nothing playing right now"
    #     }

    # -------- NEXT VIDEO --------
    if "next" in text and ctx["last_query"]:
        intent = "play"
        query = ctx["last_query"] + " next"
        video_id = get_video_id(query)

    # -------- NUMBER EXTRACTION --------
    match = re.search(r"(\d+)", text)
    if match:
        value = int(match.group(1))

    ctx["last_intent"] = intent

    # return {
    #     "intent": intent,
    #     "confidence": round(confidence, 2),
    #     "query": query,
    #     "video_id": video_id,
    #     "value": value,
    #     "response": response_for(intent, query)
    # }
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