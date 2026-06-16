import os
from pathlib import Path

_model = None
_MODEL_PATH = Path(__file__).resolve().parent.parent / "model" / "aircraft_type_3class_clean_best.pt"

_MODEL_FILES = {
    "Boeing 737": "boeing_737.glb",
    "Boeing 747": "boeing_747.glb",
    "Boeing 787": "boeing_787.glb",
}


def _load_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO(str(_MODEL_PATH))
    return _model


def classify_aircraft_type(image_path, original_filename=None):
    if not os.path.exists(image_path):
        return _fallback()

    try:
        model = _load_model()
        results = model(str(image_path), verbose=False)
        r = results[0]
        probs = r.probs
        aircraft_type = r.names[int(probs.top1)]
        confidence = float(probs.top1conf)
        return _result(aircraft_type, confidence)
    except Exception:
        return _fallback()


def _result(aircraft_type, confidence):
    return {
        "aircraft_type": aircraft_type,
        "aircraft_confidence": round(confidence, 4),
        "aircraft_type_source": "yolo_classifier",
        "aircraft_model_file": _MODEL_FILES.get(aircraft_type, "boeing_737.glb"),
    }


def _fallback():
    return {
        "aircraft_type": "Unknown",
        "aircraft_confidence": 0.0,
        "aircraft_type_source": "fallback",
        "aircraft_model_file": "boeing_737.glb",
    }
