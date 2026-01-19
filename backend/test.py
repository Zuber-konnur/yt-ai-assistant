import joblib

# ===============================
# Load trained model
# ===============================
MODEL_PATH = "app/models/intent_model.joblib"

model, vectorizer = joblib.load(MODEL_PATH)

print("✅ Model loaded successfully\n")

# ===============================
# Test sentences (you can edit)
# ===============================
test_sentences = [
    "play tmkoc episode 4305",
    "pause the video",
    "resume",
    "search lofi music",
    "scroll down",
    "scroll up",
    "go down a little",
    "increase volume",
    "lower the sound",
    "mute",
    "unmute",
    "skip 10 seconds",
    "rewind 5 seconds",
    "go back",
    "go to home",
    "help",
    "scroll a bit more down",
    "turn the volume slightly up",
    "move page upward",
    "stop"
]

# ===============================
# Predict intents
# ===============================
X_test = vectorizer.transform([s.lower() for s in test_sentences])
probs = model.predict_proba(X_test)
preds = model.classes_[probs.argmax(axis=1)]
confidences = probs.max(axis=1)

# ===============================
# Display results
# ===============================
print("🧠 Intent Predictions\n")
print(f"{'Sentence':40} {'Intent':15} {'Confidence'}")
print("-" * 70)

for s, intent, conf in zip(test_sentences, preds, confidences):
    print(f"{s:40} {intent:15} {conf:.2f}")
