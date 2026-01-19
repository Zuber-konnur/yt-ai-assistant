def response_for(intent, query=None):
    responses = {
        "play": f"Playing {query}" if query else "Playing now",
        "search": f"Searching for {query}" if query else "Searching",
        "pause": "Paused",
        "resume": "Resuming",
        "skip": "Skipping forward",
        "rewind": "Rewinding",
        "scroll_up": "Scrolling up",
        "scroll_down": "Scrolling down",
        "volume_up": "Increasing volume",
        "volume_down": "Decreasing volume",
        "mute": "Muted",
        "unmute": "Unmuted",
        "home": "Going to home page",
        "back": "Going back",
        "help": "You can ask me to play videos, search, pause, resume, scroll, and control volume."
    }
    return responses.get(intent, "Okay")
