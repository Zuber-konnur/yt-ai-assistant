def rule_based_fallback(text: str):
    text = text.lower()

    # -------- SCROLL (highest priority) --------
    if any(w in text for w in ["scroll", "move", "go"]):
        if any(w in text for w in ["down", "lower", "bottom"]):
            return "scroll_down"
        if any(w in text for w in ["up", "top", "higher"]):
            return "scroll_up"

    # -------- VOLUME --------
    if any(w in text for w in ["volume", "sound", "audio"]):
        if any(w in text for w in ["up", "increase", "raise", "louder"]):
            return "volume_up"
        if any(w in text for w in ["down", "decrease", "lower", "quieter"]):
            return "volume_down"
        
    if any(k in text for k in ["fullscreen", "full screen", "maximize"]):
        return "fullscreen"

    # -------- NAVIGATION --------
    if "home" in text:
        return "home"
    if "back" in text or "previous" in text:
        return "back"

    # -------- GENERAL CONTROLS --------
    if "play" in text:
        return "play"
    if "search" in text or "find" in text:
        return "search"
    if "pause" in text or "stop" in text:
        return "pause"
    if "resume" in text or "continue" in text:
        return "resume"
    if "skip" in text or "forward" in text:
        return "skip"
    if "rewind" in text:
        return "rewind"
    if "mute" in text:
        return "mute"
    if "unmute" in text:
        return "unmute"
    if "help" in text:
        return "help"

    return "unknown"
