import cv2
import numpy as np

from utils import extract_edges


def classify_damage_status(image_path):
    """
    Rule-based demo binary damage classifier.

    Uses stable OpenCV image features to decide whether to run damage-region
    localization. It is conservative enough for a demo and easy to replace
    with a trained binary classifier later.
    """
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read uploaded image for damage classification.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = extract_edges(image)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = max(1, gray.shape[0] * gray.shape[1])
    edge_density = float(np.count_nonzero(edges)) / image_area
    texture_irregularity = float(gray.std())

    meaningful_contours = 0
    contour_area_ratio = 0.0
    for contour in contours:
        x, y, width, height = cv2.boundingRect(contour)
        ratio = (width * height) / image_area
        if 0.0015 <= ratio <= 0.35 and width >= 10 and height >= 10:
            meaningful_contours += 1
            contour_area_ratio += ratio

    damage_score = (
        edge_density * 2.6
        + min(meaningful_contours, 40) / 85.0
        + min(texture_irregularity, 95.0) / 330.0
        + min(contour_area_ratio, 0.6) * 0.55
    )

    is_damaged = damage_score >= 0.23

    if is_damaged:
        confidence = 0.78 + min(damage_score - 0.23, 0.18)
        status = "Damaged"
    else:
        confidence = 0.82 + min(0.23 - damage_score, 0.12)
        status = "No Damage"

    return {
        "is_damaged": bool(is_damaged),
        "damage_status": status,
        "damage_status_confidence": round(min(confidence, 0.96), 2),
        "damage_status_source": "demo_classifier",
        "damage_features": {
            "edge_density": round(edge_density, 6),
            "texture_irregularity": round(texture_irregularity, 4),
            "meaningful_contours": meaningful_contours,
            "contour_area_ratio": round(contour_area_ratio, 6),
            "damage_score": round(damage_score, 6),
        },
    }
