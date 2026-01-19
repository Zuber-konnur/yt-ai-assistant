import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# =====================================
# 1. Load dataset
# =====================================
DATASET_PATH = "intent_dataset.json"
MODEL_OUTPUT_PATH = "app/models/intent_model.joblib"

with open(DATASET_PATH, "r", encoding="utf-8") as f:
    dataset = json.load(f)

texts = []
labels = []

for intent, examples in dataset.items():
    for sentence in examples:
        texts.append(sentence.lower())
        labels.append(intent)

print("📊 Dataset Summary")
print("Total samples:", len(texts))
print("Total intents:", len(set(labels)))

# =====================================
# 2. Train-test split (STRATIFIED)
# =====================================
X_train, X_test, y_train, y_test = train_test_split(
    texts,
    labels,
    test_size=0.2,
    stratify=labels,
    random_state=42
)

# =====================================
# 3. TF-IDF Vectorization
# =====================================
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),        # unigrams + bigrams
    stop_words="english",
    min_df=1
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# =====================================
# 4. Train Intent Classifier
# =====================================
model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced",
    solver="lbfgs"
)

model.fit(X_train_vec, y_train)

# =====================================
# 5. Evaluation
# =====================================
y_pred = model.predict(X_test_vec)

print("\n📈 Model Evaluation")
print(classification_report(y_test, y_pred))
print("Accuracy:", round(accuracy_score(y_test, y_pred), 4))

# =====================================
# 6. Save model
# =====================================
joblib.dump(
    (model, vectorizer),
    MODEL_OUTPUT_PATH
)

print("\n✅ Intent classification model trained and saved successfully")
print(f"📦 Saved at: {MODEL_OUTPUT_PATH}")
