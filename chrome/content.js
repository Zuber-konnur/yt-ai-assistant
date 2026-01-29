if (!window.ytAIAssistantLoaded) {
  window.ytAIAssistantLoaded = true;

  // --- Configurations ---
  const DEEPGRAM_API_KEY = "ee586e8d2f981068b94717ff00fe2ac79761c301";
  const COMMAND_WINDOW_MS = 30000; // 30-second rolling window
  const SESSION_ID = crypto.randomUUID();

  // --- State Variables ---
  let dgSocket, audioContext, processor, input, commandTimer;
  let assistantActive = false; // Is Deepgram phase active?
  let isJarvisSpeaking = false; // Speech Lock flag
// Add these variables to your state section
let transcriptBuffer = "";
let sendTimeout = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const wakeWordRecognition = new SpeechRecognition();
  wakeWordRecognition.lang = "en-US";
  wakeWordRecognition.continuous = true;
  wakeWordRecognition.interimResults = false;

  /* ===============================
     UTILITY: NUMBER PARSER (Words to Digits)
  =============================== */
  function wordToNumber(text) {
    if (!text) return null;
    const wordsMap = {
      "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
      "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100
    };
    const digitMatch = text.match(/\d+/);
    if (digitMatch) return parseInt(digitMatch[0]);

    let total = 0;
    const inputWords = text.toLowerCase().split(/[\s-]+/);
    inputWords.forEach(w => {
      if (wordsMap[w] !== undefined) total += wordsMap[w];
    });
    return total > 0 ? total : null;
  }

  /* ===============================
     AUDIO UTILITIES
  =============================== */
  function speak(text) {
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => { isJarvisSpeaking = true; };
    utterance.onend = () => {
      // 2-second buffer to let room echo clear
      setTimeout(() => { isJarvisSpeaking = false; }, 2000);
    };
    speechSynthesis.speak(utterance);
  }

  function updateStatus(txt, color) {
    const el = document.getElementById("yt-ai-status");
    if (el) { el.innerText = `Status: ${txt}`; el.style.color = color || "#fff"; }
  }

  /* ===============================
     DEEPGRAM & CONVERSATION TIMER
  =============================== */
  function resetCommandTimer() {
    if (commandTimer) clearTimeout(commandTimer);
    commandTimer = setTimeout(() => {
      stopDeepgram("Conversation Timeout");
    }, COMMAND_WINDOW_MS);
  }

  async function startDeepgram() {
    if (assistantActive) return;
    assistantActive = true;
    updateStatus("Listening...", "#00f2ff");

    // endpointing=300 helps capture full sentences naturally
    const url = `wss://api.deepgram.com/v1/listen?model=nova-3&language=en-IN&smart_format=true&encoding=linear16&sample_rate=16000&endpointing=300`;
    dgSocket = new WebSocket(url, ["token", DEEPGRAM_API_KEY]);

    dgSocket.onopen = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext({ sampleRate: 16000 });
      input = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isJarvisSpeaking) return; // DON'T SEND AUDIO IF JARVIS IS TALKING

        const float32Data = e.inputBuffer.getChannelData(0);
        let l = float32Data.length;
        let int16Data = new Int16Array(l);
        while (l--) int16Data[l] = Math.min(1, float32Data[l]) * 0x7FFF;
        if (dgSocket.readyState === WebSocket.OPEN) dgSocket.send(int16Data);
      };

      input.connect(processor);
      processor.connect(audioContext.destination);
      resetCommandTimer();
    };

    dgSocket.onmessage = (event) => {
      if (isJarvisSpeaking) return;
      const data = JSON.parse(event.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;

      if (transcript && transcript.trim().length > 0) {
        // Append new transcript parts to the buffer
        transcriptBuffer += " " + transcript;
        console.log("[Buffering]:", transcriptBuffer.trim());

        // Reset the 30s conversation window
        resetCommandTimer();

        // DEBOUNCE: Wait 500ms after the user stops talking before sending to backend
        if (sendTimeout) clearTimeout(sendTimeout);

        sendTimeout = setTimeout(() => {
          const finalCommand = transcriptBuffer.trim();
          if (finalCommand) {
            console.log("[Sending Full Command]:", finalCommand);
            sendCommandToBackend(finalCommand);
            transcriptBuffer = ""; // Clear buffer after sending
          }
        }, 500); // Adjust this delay for faster/slower response
      }
    };
  }

  function stopDeepgram(reason) {
    console.log("Stopping Deepgram:", reason);
    if (dgSocket) dgSocket.close();
    if (processor) processor.disconnect();
    if (input) input.disconnect();
    if (audioContext) audioContext.close();
    clearTimeout(commandTimer);
    assistantActive = false;

    updateStatus("Waiting for 'Hey Jarvis'", "#fff");
    // Re-enable native wake-word detection
    try { wakeWordRecognition.start(); } catch (e) { }
  }

  /* ===============================
     EXECUTE INTENT (Logic & DOM)
  =============================== */
  function executeIntent(data, rawText) {
    const video = document.querySelector("video");
    const extractedValue = wordToNumber(rawText);

    // 1. Navigation
    if ((data.intent === "play" || data.intent === "search") && (data.video_id || data.query)) {
      speak(data.response);
      const url = data.intent === "play"
        ? `https://www.youtube.com/watch?v=${data.video_id}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(data.query)}`;
      window.location.href = url;
      return;
    }

    // 2. Control Logic
    switch (data.intent) {
      case "pause": video?.pause(); break;
      case "resume": video?.play(); break;
      case "mute": if (video) video.muted = true; break;
      case "unmute": if (video) video.muted = false; break;
      case "skip": if (video) video.currentTime += (extractedValue || 10); break;
      case "rewind": if (video) video.currentTime -= (extractedValue || 10); break;
      case "fullscreen":
        if (video) {
          if (!document.fullscreenElement) video.requestFullscreen();
          else document.exitFullscreen();
        }
        break;
      case "volume_up":
        if (video) {
          if (extractedValue) video.volume = Math.min(1, extractedValue / 100);
          else video.volume = Math.min(1, video.volume + 0.1);
        }
        break;
      case "volume_down":
        if (video) {
          if (extractedValue) video.volume = Math.max(0, extractedValue / 100);
          else video.volume = Math.max(0, video.volume - 0.1);
        }
        break;
      case "scroll_up": window.scrollBy({ top: -600, behavior: "smooth" }); break;
      case "scroll_down": window.scrollBy({ top: 600, behavior: "smooth" }); break;
      case "home": window.location.href = "https://www.youtube.com/"; break;
      case "back": window.history.back(); break;
    }

    if (data.response) speak(data.response);
  }

  async function sendCommandToBackend(text) {
    try {
      const res = await fetch("http://127.0.0.1:8000/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text, session_id: SESSION_ID })
      });
      const data = await res.json();
      executeIntent(data, text);
    } catch (err) {
      console.error("Backend Error");
    }
  }

  /* ===============================
     UI & INITIALIZATION
  =============================== */
  const wrapper = document.createElement("div");
  wrapper.id = "yt-ai-container";
  wrapper.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; background:rgba(15,15,15,0.9); backdrop-filter:blur(8px); color:#fff; padding:15px; border-radius:12px; width:220px; text-align:center; border:1px solid #333; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";

  const status = document.createElement("div");
  status.id = "yt-ai-status";
  status.style.cssText = "font-size:12px; font-weight:bold;";
  status.innerText = "Status: Initializing...";

  wrapper.appendChild(status);
  document.body.appendChild(wrapper);

  wakeWordRecognition.onresult = (event) => {
    if (isJarvisSpeaking || assistantActive) return;
    const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
    if (text.includes("hey jarvis")) {
      wakeWordRecognition.stop();
      speak("Yes?");
      startDeepgram();
    }
  };

  wakeWordRecognition.onend = () => {
    if (!assistantActive) {
      try { wakeWordRecognition.start(); } catch (e) { }
    }
  };

  // Auto-Arm on page load
  wakeWordRecognition.start();
  updateStatus("Waiting for 'Hey Jarvis'", "#fff");
}