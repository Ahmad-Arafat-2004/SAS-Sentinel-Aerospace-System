import os
import uuid
import cv2
import numpy as np

from utils import extract_edges
from utils.severity import calculate_severity
from utils.zone_mapper import map_damage_to_zone

try:
    from config import (
        YOLO_CONF_THRESHOLD,
        YOLO_IOU_THRESHOLD,
        MIN_DETECTION_AREA_RATIO,
        MAX_DETECTION_AREA_RATIO,
    )
except Exception:
    YOLO_CONF_THRESHOLD = 0.25
    YOLO_IOU_THRESHOLD = 0.45
    MIN_DETECTION_AREA_RATIO = 0.0004
    MAX_DETECTION_AREA_RATIO = 0.65


# ============================================================
# Model Path
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "best.pt")


# ============================================================
# Optional YOLO Loader
# ============================================================

def load_yolo_model():
    """
    Loads YOLO model only if:
    1. ultralytics is installed
    2. backend/model/best.pt exists

    If not available, returns None and system uses demo detector.
    """
    if not os.path.exists(MODEL_PATH):
        return None

    try:
        from ultralytics import YOLO
        model = YOLO(MODEL_PATH)
        return model
    except Exception as e:
        print("[WARNING] YOLO model could not be loaded.")
        print(str(e))
        return None


# Load once when file starts
YOLO_MODEL = load_yolo_model()


# ============================================================
# Helper Functions
# ============================================================

def normalize_damage_type(class_name):
    """
    Converts model class names into clean display labels.
    """
    if not class_name:
        return "Unknown damage"

    name = str(class_name).replace("_", " ").replace("-", " ").strip().lower()

    mapping = {
        "crack": "Crack",
        "stress crack": "Crack",
        "scratch": "Scratch",
        "dent": "Dent",
        "corrosion": "Corrosion",
        "hole": "Paint Damage",
        "missing head": "Missing Head",
        "missing-head": "Missing Head",
        "paint off": "Paint Damage",
        "paint-off": "Paint Damage",
        "paint damage": "Paint Damage",
        "unknown": "Paint Damage",
    }

    return mapping.get(name, name.title())


def get_box_area_ratio(x1, y1, x2, y2, image_width, image_height):
    """
    Calculates bounding box area compared to full image area.
    """
    box_width = max(0, x2 - x1)
    box_height = max(0, y2 - y1)

    box_area = box_width * box_height
    image_area = image_width * image_height

    if image_area <= 0:
        return 0

    return box_area / image_area


def draw_detection_label(image, x1, y1, label, color):
    """
    Draws a clean label box above the detection bounding box.
    """
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.65
    thickness = 2

    text_size, _ = cv2.getTextSize(label, font, font_scale, thickness)
    text_width, text_height = text_size

    label_x1 = max(0, min(x1, image.shape[1] - text_width - 14))
    label_y1 = max(0, y1 - text_height - 14)
    label_x2 = min(image.shape[1] - 1, label_x1 + text_width + 12)
    label_y2 = y1

    cv2.rectangle(image, (label_x1, label_y1), (label_x2, label_y2), color, -1)
    cv2.putText(
        image,
        label,
        (label_x1 + 6, label_y2 - 7),
        font,
        font_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA
    )


def get_severity_color(severity):
    """
    Returns OpenCV BGR color based on severity.
    """
    severity = str(severity).lower()

    if severity == "critical":
        return (0, 0, 255)       # Red
    if severity == "high":
        return (0, 80, 255)      # Orange-red
    if severity == "medium":
        return (0, 180, 255)     # Orange/yellow
    if severity == "low":
        return (0, 255, 0)       # Green

    return (255, 255, 255)       # White


def run_clean_detection(image_path, view="right"):
    """
    Creates a processed image for images classified as no-damage.
    No red damage region is drawn.
    """
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read uploaded image.")

    output_image = image.copy()
    h, w = output_image.shape[:2]
    color = (120, 240, 80)
    panel_h = max(44, int(h * 0.12))

    overlay = output_image.copy()
    cv2.rectangle(overlay, (0, 0), (w, panel_h), (20, 85, 65), -1)
    cv2.addWeighted(overlay, 0.72, output_image, 0.28, 0, output_image)

    cv2.putText(
        output_image,
        "No visible damage detected",
        (18, max(30, panel_h // 2 + 8)),
        cv2.FONT_HERSHEY_SIMPLEX,
        max(0.65, min(1.0, w / 900)),
        color,
        2,
        cv2.LINE_AA,
    )

    return {
        "image": output_image,
        "detections": [],
        "modelMode": "OpenCV Demo",
    }


# ============================================================
# Demo Detector
# ============================================================

def run_demo_detection(image, view="right"):
    """
    Demo detector used before training/adding YOLO model.

    This allows the website, backend, result page, and 3D viewer
    to be tested even before the real AI model is ready.
    """

    h, w = image.shape[:2]
    output_image = image.copy()

    edges = extract_edges(image)
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=2)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = max(1, w * h)
    center_x, center_y = w * 0.5, h * 0.56
    candidates = []
    for contour in contours:
        x, y, bw, bh = cv2.boundingRect(contour)
        area_ratio = (bw * bh) / image_area
        if not _is_valid_damage_candidate(x, y, bw, bh, w, h, area_ratio):
            continue

        aspect = bw / max(1, bh)
        contour_area = cv2.contourArea(contour) / image_area
        cx = x + bw / 2
        cy = y + bh / 2
        centrality = 1.0 - min(1.0, (((cx - center_x) / w) ** 2 + ((cy - center_y) / h) ** 2) * 3.5)
        lower_body_bonus = 0.20 if cy > h * 0.28 else -0.18
        texture_bonus = min(0.35, contour_area * 8)
        score = (
            area_ratio * 1.25
            + contour_area * 2.1
            + centrality * 0.38
            + lower_body_bonus
            + texture_bonus
            - _watermark_penalty(x, y, bw, bh, w, h)
        )
        candidates.append((score, x, y, bw, bh, area_ratio, aspect))

    if candidates:
        _, x1, y1, bw, bh, area_ratio, aspect = max(candidates, key=lambda item: item[0])
        x2 = min(w - 1, x1 + bw)
        y2 = min(h - 1, y1 + bh)
    else:
        bw = max(56, int(w * 0.20))
        bh = max(42, int(h * 0.15))
        x1 = max(0, int(w * 0.47 - bw / 2))
        y1 = max(0, int(h * 0.56 - bh / 2))
        x2 = min(w - 1, x1 + bw)
        y2 = min(h - 1, y1 + bh)
        area_ratio = ((x2 - x1) * (y2 - y1)) / image_area
        aspect = (x2 - x1) / max(1, y2 - y1)

    bbox = {
        "x": round(x1 / w, 6),
        "y": round(y1 / h, 6),
        "width": round((x2 - x1) / w, 6),
        "height": round((y2 - y1) / h, 6),
    }

    bbox_center_x = bbox["x"] + bbox["width"] / 2
    bbox_center_y = bbox["y"] + bbox["height"] / 2

    if aspect > 3.0:
        damage_type = "Crack"
    elif area_ratio > 0.09:
        damage_type = "Dent"
    elif bbox_center_y > 0.68:
        damage_type = "Corrosion"
    elif aspect > 1.6:
        damage_type = "Scratch"
    else:
        damage_type = "Paint Damage"

    confidence = round(max(0.75, min(0.96, 0.78 + area_ratio * 1.25 + min(len(contours), 80) / 600)), 2)
    severity = calculate_severity(damage_type, confidence, area_ratio)
    zone_data = map_damage_to_zone("image", bbox_center_x, bbox_center_y)

    color = get_severity_color(severity)

    overlay = output_image.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
    cv2.addWeighted(overlay, 0.12, output_image, 0.88, 0, output_image)
    cv2.rectangle(output_image, (x1, y1), (x2, y2), color, 3)
    cv2.circle(output_image, (int(bbox_center_x * w), int(bbox_center_y * h)), 5, color, -1)

    label = f"{damage_type} | {confidence:.2f} | {severity}"
    draw_detection_label(output_image, x1, y1, label, color)

    detection = {
        "id": "D-DEMO-001",
        "type": damage_type,
        "damage_type": damage_type,
        "severity": severity,
        "confidence": confidence,

        "bbox": bbox,
        "bboxPixels": {
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
        },

        "areaRatio": round(area_ratio, 6),

        "zone": zone_data.get("zone", "Fuselage"),
        "zoneLabel": zone_data.get("zoneLabel", "Fuselage"),
        "position3d": zone_data.get("position3d", {"x": 0, "y": 0, "z": 0}),

        "modelMode": "OpenCV Demo",
        "recommendation": "Inspect the affected zone manually and compare with maintenance records."
    }

    return {
        "image": output_image,
        "detections": [detection],
        "modelMode": "OpenCV Demo"
    }


def _is_valid_damage_candidate(x, y, bw, bh, image_width, image_height, area_ratio):
    if area_ratio < 0.004 or area_ratio > 0.22:
        return False
    if bw < max(18, image_width * 0.035) or bh < max(14, image_height * 0.03):
        return False

    touches_border = (
        x <= 2
        or y <= 2
        or x + bw >= image_width - 3
        or y + bh >= image_height - 3
    )
    if touches_border and area_ratio < 0.035:
        return False

    if _looks_like_corner_text_or_watermark(x, y, bw, bh, image_width, image_height, area_ratio):
        return False

    return True


def _looks_like_corner_text_or_watermark(x, y, bw, bh, image_width, image_height, area_ratio):
    cx = x + bw / 2
    cy = y + bh / 2
    aspect = bw / max(1, bh)
    top_right = cx > image_width * 0.72 and cy < image_height * 0.30
    bottom_left = cx < image_width * 0.28 and cy > image_height * 0.82
    bottom_right = cx > image_width * 0.72 and cy > image_height * 0.82
    corner = top_right or bottom_left or bottom_right

    if corner and area_ratio < 0.035:
        return True
    if corner and (aspect > 2.8 or aspect < 0.35) and area_ratio < 0.06:
        return True

    return False


def _watermark_penalty(x, y, bw, bh, image_width, image_height):
    cx = x + bw / 2
    cy = y + bh / 2
    in_top_right = cx > image_width * 0.68 and cy < image_height * 0.34
    in_bottom_corner = cy > image_height * 0.78 and (cx < image_width * 0.30 or cx > image_width * 0.70)
    if in_top_right:
        return 0.55
    if in_bottom_corner:
        return 0.35
    return 0.0


# ============================================================
# Real YOLO Detector
# ============================================================

def run_yolo_detection(image, view="right"):
    """
    Runs real YOLO detection/segmentation if backend/model/best.pt exists.

    Expected YOLO classes:
    - crack
    - scratch
    - dent
    - corrosion
    - hole
    - unknown
    """

    h, w = image.shape[:2]
    output_image = image.copy()
    detections = []

    results = YOLO_MODEL(image, conf=YOLO_CONF_THRESHOLD, iou=YOLO_IOU_THRESHOLD)

    if not results:
        return {
            "image": output_image,
            "detections": [],
            "modelMode": "YOLOv8"
        }

    result = results[0]
    names = result.names

    # -----------------------------
    # Bounding box detection support
    # -----------------------------
    if result.boxes is not None:
        for box in result.boxes:
            xyxy = box.xyxy[0].cpu().numpy()

            x1 = int(xyxy[0])
            y1 = int(xyxy[1])
            x2 = int(xyxy[2])
            y2 = int(xyxy[3])

            confidence = float(box.conf[0].cpu().numpy())
            class_id = int(box.cls[0].cpu().numpy())

            raw_class_name = names.get(class_id, "unknown")
            damage_type = normalize_damage_type(raw_class_name)

            bbox = {
                "x": x1 / w,
                "y": y1 / h,
                "width": (x2 - x1) / w,
                "height": (y2 - y1) / h,
            }

            bbox_center_x = bbox["x"] + bbox["width"] / 2
            bbox_center_y = bbox["y"] + bbox["height"] / 2

            area_ratio = get_box_area_ratio(x1, y1, x2, y2, w, h)
            if area_ratio < MIN_DETECTION_AREA_RATIO or area_ratio > MAX_DETECTION_AREA_RATIO:
                continue
            severity = calculate_severity(damage_type, confidence, area_ratio)
            zone_data = map_damage_to_zone(view, bbox_center_x, bbox_center_y)

            color = get_severity_color(severity)

            cv2.rectangle(output_image, (x1, y1), (x2, y2), color, 3)

            label = f"{damage_type} | {confidence:.2f} | {severity}"
            draw_detection_label(output_image, x1, y1, label, color)

            detection = {
                "id": f"D-{uuid.uuid4().hex[:8].upper()}",
                "type": damage_type,
                "severity": severity,
                "confidence": round(confidence, 4),

                "bbox": bbox,
                "bboxPixels": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                },

                "areaRatio": round(area_ratio, 6),

                "zone": zone_data.get("zone", "unknown"),
                "zoneLabel": zone_data.get("zoneLabel", "Unknown Aircraft Zone"),
                "position3d": zone_data.get("position3d", {"x": 0, "y": 0, "z": 0}),

                "modelMode": "YOLOv8",
                "recommendation": "Manual inspection required before aircraft release."
            }

            detections.append(detection)

    return {
        "image": output_image,
        "detections": detections,
        "modelMode": "YOLOv8"
    }


# ============================================================
# Main Detection Function
# ============================================================

def run_detection(image_path, view="right"):
    """
    Main detection function used by backend/app.py.

    If a trained YOLO model exists:
        runs real YOLO detection.

    If no model exists:
        runs demo detection.
    """

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read uploaded image.")

    if YOLO_MODEL is not None:
        return run_yolo_detection(image, view=view)

    return run_demo_detection(image, view=view)
