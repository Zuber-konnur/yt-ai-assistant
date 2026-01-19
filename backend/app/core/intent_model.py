import joblib

model, vectorizer = joblib.load("app/models/intent_model.joblib")

CONFIDENCE_THRESHOLD = 0.35

def predict_intent(text: str):
    X = vectorizer.transform([text.lower()])
    probs = model.predict_proba(X)[0]
    intent = model.classes_[probs.argmax()]
    confidence = float(probs.max())
    return intent, confidence
