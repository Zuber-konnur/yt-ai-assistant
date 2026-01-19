import time

SESSION_CONTEXT = {}
SESSION_TIMEOUT = 600  # 10 minutes

def get_context(session_id: str):
    now = time.time()

    if session_id not in SESSION_CONTEXT:
        SESSION_CONTEXT[session_id] = {
            "last_intent": None,
            "last_query": None,
            "last_video_id": None,
            "is_playing": False,
            "last_seen": now
        }
    else:
        SESSION_CONTEXT[session_id]["last_seen"] = now

    return SESSION_CONTEXT[session_id]

def cleanup_expired_sessions():
    now = time.time()
    expired_sessions = [
        sid for sid, ctx in SESSION_CONTEXT.items()
        if now - ctx["last_seen"] > SESSION_TIMEOUT
    ]
    for sid in expired_sessions:
        del SESSION_CONTEXT[sid]
