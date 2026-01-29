if (!window.ytAIAssistantLoaded) {
  window.ytAIAssistantLoaded = true;

  const SESSION_ID = crypto.randomUUID(); // Kept for schema compatibility
  let assistantActive = false;
  let isListening = false;

  /* ===============================
     UI SETUP
  =============================== */
  const wrapper = document.createElement("div");
  wrapper.id = "yt-ai-assistant";
  Object.assign(wrapper.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "99999",
    background: "#111",
    color: "#fff",
    padding: "10px",
    borderRadius: "8px",
    fontFamily: "Arial",
    width: "220px",
    textAlign: "center"
  });

  const btn = document.createElement("div");
  btn.id = "yt-ai-btn";
  btn.innerText = "🎤";
  Object.assign(btn.style, {
    cursor: "pointer",
    userSelect: "none",
    padding: "6px",
    border: "1px solid #444",
    borderRadius: "4px"
  });

  const status = document.createElement("div");
  status.id = "yt-ai-status";
  status.style.fontSize = "12px";
  status.style.marginTop = "6px";

  wrapper.appendChild(btn);
  wrapper.appendChild(status);
  document.body.appendChild(wrapper);

  function showStatus(text) {
    status.innerText = text;
    status.style.display = "block";
  }

  function hideStatus() {
    status.style.display = "none";
  }

  function speak(text) {
    if (!text) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  /* ===============================
     YOUTUBE HELPERS
  =============================== */
  function getVideo() {
    return document.querySelector("video");
  }

  function scrollPage(px) {
    window.scrollBy({ top: px, behavior: "smooth" });
  }

  function changeVolume(delta) {
    const video = getVideo();
    if (!video) return;
    video.volume = Math.min(1, Math.max(0, video.volume + delta));
  }

  /* ===============================
     BACKEND COMMUNICATION
  =============================== */
  async function sendCommand(text) {
    showStatus("Thinking...");
    try {
      const res = await fetch("http://127.0.0.1:8000/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: text,
          session_id: SESSION_ID // Backend will ignore this now
        })
      });

      const data = await res.json();
      hideStatus();

      // Consolidated all speech logic into executeIntent
      executeIntent(data);

    } catch (err) {
      speak("Backend is not available"); // Single error response
      showStatus("Backend error");
    }
  }

  /* ===============================
     EXECUTE INTENT (One Command, One Response)
  =============================== */
  function executeIntent(data) {
    const video = getVideo();

    // 1. Navigation intents - Speak before redirecting
    if (data.intent === "play" && data.video_id) {
      speak(data.response);
      window.location.href = `https://www.youtube.com/watch?v=${data.video_id}`;
      return;
    }

    if (data.intent === "search" && data.query) {
      speak(data.response);
      window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}`;
      return;
    }

    // 2. Media validation - Speak error if video is required but missing
    const mediaIntents = ["pause", "resume", "skip", "rewind", "mute", "unmute", "volume_up", "volume_down"];
    if (!video && mediaIntents.includes(data.intent)) {
      speak("No video is currently playing");
      return;
    }

    // 3. Execution Logic
    switch (data.intent) {
      case "pause": video.pause(); break;
      case "resume": video.play(); break;
      case "skip": video.currentTime += data.value || 10; break;
      case "rewind": video.currentTime -= data.value || 10; break;
      case "volume_up": changeVolume(0.1); break;
      case "volume_down": changeVolume(-0.1); break;
      case "mute": video.muted = true; break;
      case "unmute": video.muted = false; break;
      case "scroll_up": scrollPage(-500); break;
      case "scroll_down": scrollPage(500); break;
      case "home": window.location.href = "https://www.youtube.com/"; break;
      case "back": window.history.back(); break;
      case "clarify":
      case "speak_only":
      default: break;
    }

    // 4. Final Response - Speak if not handled by navigation or error
    if (data.response) {
      speak(data.response);
    }
  }

  /* ===============================
     VOICE RECOGNITION
  =============================== */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  function startListening() {
    try {
      recognition.start();
    } catch {}
  }

  recognition.onstart = () => {
    showStatus(assistantActive ? "Listening for command..." : "Waiting for wake word...");
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase().trim();
    console.log("[JARVIS] Heard:", text);

    if (!assistantActive && text.includes("hey jarvis")) {
      assistantActive = true;
      speak("Yes, I'm listening");
      showStatus("Assistant active");
      return;
    }

    if (assistantActive && text.includes("off assistant")) {
      assistantActive = false;
      speak("Assistant turned off");
      hideStatus();
      return;
    }

    if (!assistantActive) return;

    sendCommand(text);
  };

  recognition.onerror = (e) => {
    console.error("[JARVIS] Voice recognition error:", e);
    speak("Voice recognition error");
  };

  recognition.onend = () => {
    if (isListening) {
      setTimeout(startListening, 150);
    } else {
      showStatus("Assistant stopped");
    }
  };

  btn.onclick = () => {
    isListening = !isListening;

    if (isListening) {
      startListening();
      speak("Say hey Jarvis");
      showStatus("Waiting for wake word");
    } else {
      recognition.stop();
      assistantActive = false;
      speak("Assistant stopped");
      hideStatus();
    }
  };

  showStatus("Idle");
}