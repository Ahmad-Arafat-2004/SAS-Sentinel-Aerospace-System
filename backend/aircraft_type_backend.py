# ============================================================
# Standalone Aircraft Type Classification Backend
# File: aircraft_type_backend.py
# Purpose:
#   Classify uploaded aircraft image as:
#   Boeing 737 / Boeing 747 / Boeing 787
# ============================================================

import os
import uuid
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from ultralytics import YOLO


# ============================================================
# Paths
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

MODEL_PATH = BACKEND_DIR / "model" / "aircraft_type_3class_clean_best.pt"

UPLOAD_DIR = BACKEND_DIR / "uploads" / "aircraft_type"

FRONTEND_DIR = PROJECT_ROOT / "frontend"

ROOT_DIR = PROJECT_ROOT

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

MAX_UPLOAD_MB = 20


# ============================================================
# Flask Setup
# ============================================================

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# Model Loading
# ============================================================

aircraft_model = None


def load_model():
    """
    Load YOLOv8 classification model once.
    """

    global aircraft_model

    if aircraft_model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Aircraft type model not found:\n{MODEL_PATH}"
            )

        print("=" * 70)
        print("Loading Aircraft Type Model")
        print("=" * 70)
        print(f"Model path: {MODEL_PATH}")
        print("=" * 70)

        aircraft_model = YOLO(str(MODEL_PATH))

    return aircraft_model


# ============================================================
# Helpers
# ============================================================

def allowed_file(filename):
    if "." not in filename:
        return False

    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in ALLOWED_EXTENSIONS


def save_uploaded_image(file):
    """
    Save uploaded image safely and return path + filename.
    """

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[-1].lower()

    image_id = uuid.uuid4().hex
    saved_filename = f"{image_id}.{ext}"

    saved_path = UPLOAD_DIR / saved_filename

    file.save(saved_path)

    return {
        "original_name": original_name,
        "saved_filename": saved_filename,
        "saved_path": saved_path,
    }


def classify_aircraft(image_path):
    """
    Run aircraft type classification.
    """

    model = load_model()

    results = model(str(image_path), verbose=False)
    result = results[0]

    probs = result.probs

    top1_id = int(probs.top1)
    top1_conf = float(probs.top1conf)

    predicted_class = result.names[top1_id]

    top_predictions = []

    for class_id, conf in zip(probs.top5, probs.top5conf):
        class_id = int(class_id)

        top_predictions.append({
            "class_name": result.names[class_id],
            "confidence": float(conf),
            "confidence_percent": round(float(conf) * 100, 2)
        })

    return {
        "aircraft_type": predicted_class,
        "confidence": top1_conf,
        "confidence_percent": round(top1_conf * 100, 2),
        "top_predictions": top_predictions,
    }


# ============================================================
# Routes
# ============================================================

@app.route("/", methods=["GET"])
def home():
    """
    Simple API home.
    """

    return jsonify({
        "success": True,
        "message": "Standalone Aircraft Type Classification Backend is running",
        "routes": {
            "health": "/api/health",
            "classify": "/api/aircraft/type",
            "frontend": "/aircraft_type.html"
        }
    })


@app.route("/api/health", methods=["GET"])
def health():
    """
    Health check.
    """

    model_exists = MODEL_PATH.exists()

    return jsonify({
        "success": True,
        "status": "ok",
        "message": "Aircraft type backend is running",
        "model_exists": model_exists,
        "model_path": str(MODEL_PATH),
    })


@app.route("/api/aircraft/type", methods=["POST"])
def aircraft_type_api():
    """
    Receives image and returns aircraft type.
    Expected form-data:
      image: image file
    """

    try:
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided. Use form field name: image"
            }), 400

        file = request.files["image"]

        if not file or file.filename == "":
            return jsonify({
                "success": False,
                "error": "Empty image file"
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": "Invalid file type. Allowed: jpg, jpeg, png, webp"
            }), 400

        saved = save_uploaded_image(file)

        result = classify_aircraft(saved["saved_path"])

        image_url = f"{request.host_url.rstrip()}/uploads/aircraft_type/{saved['saved_filename']}"

        return jsonify({
            "success": True,
            "aircraft_type": result["aircraft_type"],
            "confidence": result["confidence"],
            "confidence_percent": result["confidence_percent"],
            "top_predictions": result["top_predictions"],
            "uploaded_image": saved["saved_filename"],
            "uploaded_image_url": image_url,
            "original_filename": saved["original_name"],
            "model": "aircraft_type_3class_clean_best.pt"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/uploads/aircraft_type/<filename>", methods=["GET"])
def get_uploaded_aircraft_image(filename):
    """
    Serve uploaded aircraft images.
    """

    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/aircraft_type.html", methods=["GET"])
def aircraft_type_page():
    """
    Serve frontend page directly from frontend folder.
    """

    return send_from_directory(FRONTEND_DIR, "aircraft_type.html")


# ============================================================
# Error Handlers
# ============================================================

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "success": False,
        "error": f"File too large. Maximum upload size is {MAX_UPLOAD_MB} MB"
    }), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Route not found"
    }), 404


# ============================================================
# Run
# ============================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Standalone Aircraft Type Backend")
    print("=" * 70)
    print(f"Root: {ROOT_DIR}")
    print(f"Model: {MODEL_PATH}")
    print(f"Upload folder: {UPLOAD_DIR}")
    print("URL: http://127.0.0.1:5050")
    print("=" * 70)

    # Load model at startup to catch errors early
    load_model()

    app.run(
        host="127.0.0.1",
        port=5050,
        debug=False,
        use_reloader=False

    )