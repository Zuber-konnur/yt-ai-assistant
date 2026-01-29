# Context feature disabled. File maintained for structural consistency.

def get_context(session_id: str):
    """Returns an empty dictionary as sessions are no longer tracked."""
    return {}

def cleanup_expired_sessions():
    """No-op function. Context cleanup is no longer required."""
    pass