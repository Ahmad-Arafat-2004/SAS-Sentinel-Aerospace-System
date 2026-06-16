import os
import json
import uuid
import traceback
from datetime import datetime

import cv2
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from config import (
    UPLOAD_IMAGE_DIR,
    RESULT_IMAGE_DIR,
    RESULT_JSON_DIR,
    ALLOWED_IMAGE_EXTENSIONS,
    MAX_UPLOAD_MB,
    DEFAULT_VIEW,
    ALLOWED_AIRCRAFT_VIEWS,
    API_HOST,
    API_PORT,
    DEBUG_MODE,
    DATASET_SOURCE_NAME,
    ensure_project_folders,
)

from utils.file_handler import allowed_file, save_uploaded_file, ensure_folder
from utils.aircraft_classifier import classify_aircraft_type
from utils.damage_classifier import classify_damage_status
from utils.detector import run_clean_detection, run_detection


# ============================================================
# Flask App Setup
# ============================================================

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

# Create required project folders when backend starts
ensure_project_folders()


# ============================================================
# Helper Functions
# ============================================================

def make_result_url(folder_type, filename):
    """
    Creates a dynamic result URL based on the current backend host.

    Example:
    /results/images/file.jpg
    /results/json/file.json
    """
    return f"{request.host_url.rstrip('/')}/results/{folder_type}/{filename}"


def make_upload_url(filename):
    return f"{request.host_url.rstrip('/')}/uploads/images/{filename}"


def create_error_response(message, status_code=400, details=None):
    """
    Standard API error response.
    """
    response = {
        "success": False,
        "error": message
    }

    if details:
        response["details"] = details

    return jsonify(response), status_code


def load_json_file(json_path):
    """
    Safely loads a JSON file.
    """
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def get_primary_detection(result_data):
    detections = result_data.get("detections", []) if isinstance(result_data, dict) else []
    return detections[0] if detections else {}


def normalize_zone_name(value):
    if value is None or str(value).strip().lower() in {"", "none", "n/a", "null"}:
        return "None"

    raw = str(value or "Fuselage").replace("_", " ").replace("-", " ").strip().lower()
    if "left" in raw and "wing" in raw:
        return "Left Wing"
    if "right" in raw and "wing" in raw:
        return "Right Wing"
    if "nose" in raw:
        return "Nose"
    if "forward" in raw:
        return "Forward Fuselage Zone"
    if "rear" in raw or "aft" in raw:
        return "Rear Fuselage Zone"
    if "mid" in raw or "fuselage" in raw:
        return "Mid Fuselage Zone"
    if "tail" in raw or "stabilizer" in raw or "aft" in raw:
        return "Tail"
    if "engine" in raw:
        return "Engine"
    return "Mid Fuselage Zone"


def build_preferred_result(result_data):
    detection = get_primary_detection(result_data)
    is_damaged = bool(result_data.get("is_damaged", result_data.get("damageDetected", True)))
    damage_status = result_data.get("damage_status") or ("Damaged" if is_damaged else "No Damage")
    damage_type = (
        result_data.get("damage_type")
        or detection.get("damage_type")
        or detection.get("type")
        or ("Paint Damage" if is_damaged else "No Damage")
    )
    confidence = float(
        result_data.get("confidence")
        or detection.get("confidence")
        or result_data.get("damage_status_confidence")
        or 0.0
    )
    severity = result_data.get("severity") or detection.get("severity") or ("Low" if is_damaged else "None")
    zone = normalize_zone_name(result_data.get("zone") or detection.get("zoneLabel") or detection.get("zone"))
    if not is_damaged:
        damage_type = "No Damage"
        severity = "None"
        zone = "None"

    created_at = result_data.get("created_at") or result_data.get("createdAt") or datetime.now().isoformat(timespec="seconds")
    result_id = result_data.get("result_id") or result_data.get("resultId") or result_data.get("id")
    original_url = result_data.get("original_image_url") or result_data.get("originalImageUrl")
    processed_url = result_data.get("processed_image_url") or result_data.get("resultImageUrl")

    recommendations = result_data.get("recommendations")
    if not isinstance(recommendations, list):
        recommendations = get_default_recommendations(is_damaged)

    preferred = {
        "result_id": result_id,
        "aircraft_type": result_data.get("aircraft_type", "Default Aircraft"),
        "aircraft_confidence": float(result_data.get("aircraft_confidence") or 0.0),
        "aircraft_type_source": result_data.get("aircraft_type_source", "demo_classifier"),
        "aircraft_model_file": result_data.get("aircraft_model_file", "aircraft.glb"),
        "is_damaged": is_damaged,
        "damage_status": damage_status,
        "damage_status_confidence": float(result_data.get("damage_status_confidence") or confidence),
        "damage_status_source": result_data.get("damage_status_source", "demo_classifier"),
        "damage_type": damage_type,
        "confidence": round(confidence, 4),
        "severity": severity,
        "zone": zone,
        "description": result_data.get("description") or get_default_description(is_damaged),
        "recommendations": recommendations,
        "original_image_url": original_url,
        "processed_image_url": processed_url,
        "created_at": created_at,
        "original_filename": result_data.get("original_filename") or result_data.get("originalFile"),
        "aircraft_view": result_data.get("aircraft_view") or result_data.get("view", DEFAULT_VIEW),
        "area_ratio": float(result_data.get("area_ratio") or detection.get("areaRatio") or 0.0),
        "total_detections": int(result_data.get("total_detections") or result_data.get("totalDetections") or len(result_data.get("detections", []))),
        "position_3d": result_data.get("position_3d") or detection.get("position3d"),
        "model_mode": result_data.get("model_mode") or result_data.get("modelMode", "opencv_demo"),
        "dataset_source": result_data.get("dataset_source", DATASET_SOURCE_NAME),
    }

    # Compatibility fields used by the existing frontend.
    preferred.update({
        "resultId": result_id,
        "createdAt": created_at,
        "originalFile": result_data.get("originalFile"),
        "uploadedFile": result_data.get("uploadedFile"),
        "uploadedFileSizeMb": result_data.get("uploadedFileSizeMb"),
        "view": result_data.get("view", DEFAULT_VIEW),
        "damageDetected": is_damaged,
        "totalDetections": result_data.get("totalDetections", len(result_data.get("detections", []))),
        "detections": result_data.get("detections", []),
        "modelMode": result_data.get("modelMode", "opencv_demo"),
        "datasetSource": result_data.get("datasetSource") or result_data.get("dataset_source", DATASET_SOURCE_NAME),
        "resultImageUrl": processed_url,
        "resultJsonUrl": result_data.get("resultJsonUrl"),
        "message": result_data.get("message", "Damage detected successfully" if is_damaged else "No visible damage detected"),
    })

    return preferred


def get_default_description(is_damaged):
    if is_damaged:
        return "Detected possible aircraft surface damage."

    return "No visible aircraft surface damage was detected in this image."


def get_default_recommendations(is_damaged):
    if is_damaged:
        return [
            "Inspect the affected zone manually.",
            "Compare with maintenance records.",
            "Schedule non-destructive testing if severity is high.",
        ]

    return [
        "No immediate damage action required.",
        "Keep regular visual inspection schedule.",
        "Use manual inspection if the image quality is poor.",
    ]


# ============================================================
# Home Route
# ============================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Aircraft Damage Detection 3D Backend API",
        "availableRoutes": {
            "health": "/api/health",
            "detectImage": "/api/detect/image",
            "history": "/api/results/history",
            "singleResult": "/api/results/<result_id>",
            "resultImage": "/results/images/<filename>",
            "resultJson": "/results/json/<filename>"
        }
    })


# ============================================================
# Health Check
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "ok",
        "message": "SAS backend is running"
    })


# ============================================================
# Image Detection API
# ============================================================

@app.route("/api/detect/image", methods=["POST"])
def detect_image():
    """
    Receives an uploaded aircraft image, runs detection,
    saves result image and JSON result, then returns result data.

    Expected form-data:
    - image: uploaded image file
    - view: optional aircraft view
      allowed values: front, back, left, right, top, bottom, unknown
    """

    # -----------------------------
    # Validate file exists
    # -----------------------------
    if "image" not in request.files:
        return create_error_response(
            "No image file provided. Use form field name: image",
            status_code=400
        )

    file = request.files["image"]

    if file.filename == "":
        return create_error_response(
            "Empty filename",
            status_code=400
        )

    # -----------------------------
    # Validate extension
    # -----------------------------
    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return create_error_response(
            f"Unsupported image type. Allowed types: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
            status_code=400
        )

    # -----------------------------
    # Read aircraft view
    # -----------------------------
    view = request.form.get("view", DEFAULT_VIEW).strip().lower()

    if view not in ALLOWED_AIRCRAFT_VIEWS:
        view = "unknown"

    # -----------------------------
    # Ensure folders exist
    # -----------------------------
    ensure_folder(UPLOAD_IMAGE_DIR)
    ensure_folder(RESULT_IMAGE_DIR)
    ensure_folder(RESULT_JSON_DIR)

    # -----------------------------
    # Save uploaded image
    # -----------------------------
    try:
        saved = save_uploaded_file(
            file,
            UPLOAD_IMAGE_DIR,
            allowed_extensions=ALLOWED_IMAGE_EXTENSIONS
        )
    except Exception as e:
        print("Upload save error:")
        traceback.print_exc()

        return create_error_response(
            "Failed to save uploaded image",
            status_code=500,
            details=str(e)
        )

    # -----------------------------
    # Classify aircraft and damage status first
    # -----------------------------
    try:
        aircraft_classification = classify_aircraft_type(saved["path"], saved.get("original_name"))
        damage_classification = classify_damage_status(saved["path"])
    except Exception as e:
        print("Classification error:")
        traceback.print_exc()

        return create_error_response(
            "Classification failed while analyzing the image",
            status_code=500,
            details=str(e)
        )

    # -----------------------------
    # Run damage-region detection only when needed
    # -----------------------------
    try:
        if damage_classification.get("is_damaged"):
            detection_result = run_detection(saved["path"], view=view)
        else:
            detection_result = run_clean_detection(saved["path"], view=view)
    except Exception as e:
        print("Detection error:")
        traceback.print_exc()

        return create_error_response(
            "Detection failed while analyzing the image",
            status_code=500,
            details=str(e)
        )

    # -----------------------------
    # Validate detection output
    # -----------------------------
    if not isinstance(detection_result, dict):
        return create_error_response(
            "Detector returned invalid result format",
            status_code=500
        )

    if "image" not in detection_result:
        return create_error_response(
            "Detector result does not contain output image",
            status_code=500
        )

    if "detections" not in detection_result:
        detection_result["detections"] = []

    # -----------------------------
    # Save result image and JSON
    # -----------------------------
    result_id = uuid.uuid4().hex

    result_image_name = f"{result_id}.jpg"
    result_json_name = f"{result_id}.json"

    result_image_path = os.path.join(RESULT_IMAGE_DIR, result_image_name)
    result_json_path = os.path.join(RESULT_JSON_DIR, result_json_name)

    image_saved = cv2.imwrite(result_image_path, detection_result["image"])

    if not image_saved:
        return create_error_response(
            "Failed to save result image",
            status_code=500
        )

    # -----------------------------
    # Prepare response JSON
    # -----------------------------
    detections = detection_result.get("detections", [])
    damage_detected = bool(damage_classification.get("is_damaged"))

    created_at = datetime.now().isoformat(timespec="seconds")
    primary_detection = detections[0] if detections else {}
    processed_image_url = make_result_url("images", result_image_name)
    original_image_url = make_upload_url(saved.get("saved_name"))
    result_json_url = make_result_url("json", result_json_name)

    base_data = {
        "result_id": result_id,
        **aircraft_classification,
        **damage_classification,
        "damage_type": primary_detection.get("type", "Paint Damage") if damage_detected else "No Damage",
        "confidence": primary_detection.get("confidence", damage_classification.get("damage_status_confidence", 0.0)),
        "severity": primary_detection.get("severity", "Low") if damage_detected else "None",
        "zone": normalize_zone_name(primary_detection.get("zoneLabel") or primary_detection.get("zone")) if damage_detected else "None",
        "description": get_default_description(damage_detected),
        "recommendations": get_default_recommendations(damage_detected),
        "original_image_url": original_image_url,
        "processed_image_url": processed_image_url,
        "created_at": created_at,
        "original_filename": saved.get("original_name"),
        "aircraft_view": view,
        "area_ratio": primary_detection.get("areaRatio", 0.0) if damage_detected else 0.0,
        "total_detections": len(detections) if damage_detected else 0,
        "position_3d": primary_detection.get("position3d") if damage_detected else None,
        "model_mode": detection_result.get("modelMode", "unknown"),
        "dataset_source": DATASET_SOURCE_NAME,

        "resultId": result_id,
        "createdAt": created_at,
        "originalFile": saved.get("original_name"),
        "uploadedFile": saved.get("saved_name"),
        "uploadedFileSizeMb": saved.get("size_mb"),
        "view": view,
        "damageDetected": damage_detected,
        "totalDetections": len(detections) if damage_detected else 0,
        "detections": detections if damage_detected else [],
        "modelMode": detection_result.get("modelMode", "unknown"),
        "datasetSource": DATASET_SOURCE_NAME,
        "resultImageUrl": processed_image_url,
        "originalImageUrl": original_image_url,
        "resultJsonUrl": result_json_url,
        "message": (
            "Damage detected successfully"
            if damage_detected
            else "No visible damage detected"
        )
    }

    response_data = build_preferred_result(base_data)

    # -----------------------------
    # Save JSON result
    # -----------------------------
    try:
        with open(result_json_path, "w", encoding="utf-8") as f:
            json.dump(response_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("JSON save error:")
        traceback.print_exc()

        return create_error_response(
            "Detection completed but failed to save result JSON",
            status_code=500,
            details=str(e)
        )

    return jsonify({
        "success": True,
        "result": response_data,
        **response_data
    })


# ============================================================
# Results History API
# ============================================================

@app.route("/api/results/history", methods=["GET"])
def results_history():
    """
    Returns saved detection history from backend/results/json.
    Used by frontend/history.html.
    """

    ensure_folder(RESULT_JSON_DIR)

    history = []

    json_files = [
        f for f in os.listdir(RESULT_JSON_DIR)
        if f.lower().endswith(".json")
    ]

    for filename in json_files:
        json_path = os.path.join(RESULT_JSON_DIR, filename)
        data = load_json_file(json_path)

        if not data:
            continue

        history.append(build_preferred_result(data))

    history.sort(
        key=lambda item: item.get("created_at") or item.get("createdAt") or "",
        reverse=True
    )

    return jsonify({
        "success": True,
        "count": len(history),
        "history": history,
        "results": history
    })


# ============================================================
# Single Result API
# ============================================================

@app.route("/api/results/<result_id>", methods=["GET"])
def get_single_result(result_id):
    """
    Returns one detection result by resultId.
    Used by result.html if we pass ?id=RESULT_ID.
    """

    if not result_id:
        return create_error_response(
            "No result ID provided",
            status_code=400
        )

    result_id = str(result_id).strip()

    # Only allow UUID hex strings (32 hex chars) to prevent path traversal.
    if (
        not result_id
        or len(result_id) != 32
        or not all(c in "0123456789abcdefABCDEF" for c in result_id)
    ):
        return create_error_response("Invalid result ID format", status_code=400)

    json_path = os.path.join(RESULT_JSON_DIR, f"{result_id}.json")

    if not os.path.exists(json_path):
        return create_error_response(
            "Result not found",
            status_code=404
        )

    data = load_json_file(json_path)

    if not data:
        return create_error_response(
            "Failed to read result JSON",
            status_code=500
        )

    result = build_preferred_result(data)
    return jsonify({
        "success": True,
        "result": result,
        **result
    })


# ============================================================
# Static Result Files
# ============================================================

@app.route("/results/images/<filename>", methods=["GET"])
def get_result_image(filename):
    return send_from_directory(RESULT_IMAGE_DIR, filename)


@app.route("/uploads/images/<filename>", methods=["GET"])
def get_upload_image(filename):
    return send_from_directory(UPLOAD_IMAGE_DIR, filename)


@app.route("/results/json/<filename>", methods=["GET"])
def get_result_json(filename):
    return send_from_directory(RESULT_JSON_DIR, filename)


# ============================================================
# Error Handlers
# ============================================================

@app.errorhandler(413)
def file_too_large(error):
    return create_error_response(
        f"File too large. Maximum upload size is {MAX_UPLOAD_MB} MB",
        status_code=413
    )


@app.errorhandler(404)
def not_found(error):
    return create_error_response(
        "API route not found",
        status_code=404
    )


@app.errorhandler(500)
def internal_error(error):
    return create_error_response(
        "Internal server error",
        status_code=500
    )


# ============================================================
# Run Server
# ============================================================

if __name__ == "__main__":
    app.run(
        debug=DEBUG_MODE,
        host=API_HOST,
        port=API_PORT
    )
