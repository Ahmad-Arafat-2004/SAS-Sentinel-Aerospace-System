# ============================================================
# Aircraft Type Classifier
# File: backend/utils/aircraft_type_classifier.py
# ============================================================

from pathlib import Path
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "model" / "aircraft_type_3class_clean_best.pt"

_model = None


def load_aircraft_type_model():
    """
    Loads aircraft type classification model once.
    """
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Aircraft type model not found: {MODEL_PATH}")

        _model = YOLO(str(MODEL_PATH))

    return _model


def classify_aircraft_type(image_path):
    """
    Classifies aircraft type from image.

    Returns:
    {
        "aircraft_type": "Boeing 747",
        "confidence": 0.98,
        "top_predictions": [...]
    }
    """

    model = load_aircraft_type_model()

    results = model(str(image_path), verbose=False)
    result = results[0]

    probs = result.probs

    top1_id = int(probs.top1)
    top1_conf = float(probs.top1conf)
    aircraft_type = result.names[top1_id]

    top_predictions = []

    for class_id, conf in zip(probs.top5, probs.top5conf):
        class_id = int(class_id)
        top_predictions.append({
            "class_name": result.names[class_id],
            "confidence": float(conf)
        })

    return {
        "aircraft_type": aircraft_type,
        "confidence": top1_conf,
        "top_predictions": top_predictions
    }