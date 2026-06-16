import os


# ============================================================
# Base Paths
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PROJECT_ROOT = os.path.dirname(BASE_DIR)

FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
LOCALIZATION_DIR = os.path.join(PROJECT_ROOT, "3d_localization")


# ============================================================
# Upload Paths
# ============================================================

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

UPLOAD_IMAGE_DIR = os.path.join(UPLOAD_DIR, "images")
UPLOAD_VIDEO_DIR = os.path.join(UPLOAD_DIR, "videos")


# ============================================================
# Result Paths
# ============================================================

RESULT_DIR = os.path.join(BASE_DIR, "results")

RESULT_IMAGE_DIR = os.path.join(RESULT_DIR, "images")
RESULT_VIDEO_DIR = os.path.join(RESULT_DIR, "videos")
RESULT_JSON_DIR = os.path.join(RESULT_DIR, "json")


# ============================================================
# Static Preview Paths
# ============================================================

STATIC_DIR = os.path.join(BASE_DIR, "static")
RESULT_PREVIEW_DIR = os.path.join(STATIC_DIR, "result_previews")


# ============================================================
# Model Paths
# ============================================================

MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "best.pt")


# ============================================================
# Dataset Paths
# ============================================================
# Current best dataset:
# Optimized 5-class dataset:
# 0 crack
# 1 dent
# 2 scratch
# 3 paint_damage
# 4 other_damage
#
# Your current folder has a nested structure:
# data/aircraft_damage_5class_yolov8_clean/aircraft_damage_5class_yolov8_clean/data.yaml

YOLO_DATASET_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "aircraft_damage_5class_yolov8_clean",
    "aircraft_damage_5class_yolov8_clean"
)

YOLO_DATASET_YAML = os.path.join(YOLO_DATASET_DIR, "data.yaml")

DATASET_SOURCE_NAME = "Optimized 5-Class YOLOv8 Aircraft Damage Dataset"


# ============================================================
# 3D Localization Paths
# ============================================================

AIRCRAFT_ZONES_PATH = os.path.join(
    LOCALIZATION_DIR,
    "aircraft_zones.json"
)

LOCALIZATION_NOTES_PATH = os.path.join(
    LOCALIZATION_DIR,
    "notes",
    "localization_method.md"
)


# ============================================================
# Allowed Upload Extensions
# ============================================================

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}

ALLOWED_VIDEO_EXTENSIONS = {
    "mp4",
    "mov",
    "avi",
    "mkv"
}


# ============================================================
# Upload Limits
# ============================================================

MAX_UPLOAD_MB = 50

MAX_IMAGE_UPLOAD_MB = 20
MAX_VIDEO_UPLOAD_MB = 200


# ============================================================
# Detection Settings
# ============================================================
# IMPORTANT:
# DEFAULT_VIEW was "right" before.
# This caused close-up door/fuselage images to be mapped incorrectly
# as Right Wing Zone.
#
# "unknown" is safer because uploaded images may be close-up,
# front, side, door, nose, wing, or fuselage photos.

DEFAULT_VIEW = "unknown"

ALLOWED_AIRCRAFT_VIEWS = {
    "front",
    "back",
    "left",
    "right",
    "top",
    "bottom",
    "unknown"
}

# YOLO detection threshold:
# - 0.25 = stricter, fewer false positives, better for final demo.
# - 0.15 = more sensitive, may detect more damage but may add false positives.
#
# Use 0.15 now for testing severe/large damage images.
# If false positives increase too much, change it back to 0.25.

YOLO_CONFIDENCE_THRESHOLD = 0.25

YOLO_IOU_THRESHOLD = 0.45

# Compatibility name used by detector.py
YOLO_CONF_THRESHOLD = YOLO_CONFIDENCE_THRESHOLD

# Detection area filters:
# Lower MIN allows very small detections.
# Higher MAX allows large structural-like detections if YOLO predicts them.

MIN_DETECTION_AREA_RATIO = 0.0002

MAX_DETECTION_AREA_RATIO = 0.75


# ============================================================
# API Settings
# ============================================================

API_HOST = "127.0.0.1"
API_PORT = 5000
DEBUG_MODE = True


# ============================================================
# Utility
# ============================================================

def ensure_project_folders():
    """
    Creates all required backend folders.
    Call this once when the backend starts.
    """

    folders = [
        UPLOAD_IMAGE_DIR,
        UPLOAD_VIDEO_DIR,
        RESULT_IMAGE_DIR,
        RESULT_VIDEO_DIR,
        RESULT_JSON_DIR,
        RESULT_PREVIEW_DIR,
        MODEL_DIR,
    ]

    for folder in folders:
        os.makedirs(folder, exist_ok=True)