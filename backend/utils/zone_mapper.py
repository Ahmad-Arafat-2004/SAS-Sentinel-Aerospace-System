# ============================================================
# Aircraft Damage 3D Zone Mapper
# File: backend/utils/zone_mapper.py
# ============================================================
#
# Purpose:
# Maps 2D detection position from image space to an approximate
# aircraft 3D zone for the Three.js viewer.
#
# This is Zone-Based Mapping V1.1:
# - Works with front/back/left/right/top/bottom/unknown views.
# - More conservative for side-view close-up images.
# - Prevents aircraft door/fuselage close-up images from being
#   incorrectly mapped to Right Wing / Left Wing.
# ============================================================


def make_zone(zone, label, x, y, z, confidence_note="rule_based"):
    """
    Standard zone response format.

    position3d:
    - x: aircraft length direction
         positive = nose / forward
         negative = tail / aft

    - y: vertical direction
         positive = upper aircraft
         negative = lower aircraft / belly

    - z: left/right direction
         positive = left side
         negative = right side
    """
    return {
        "zone": zone,
        "zoneLabel": label,
        "position3d": {
            "x": x,
            "y": y,
            "z": z
        },
        "mappingMethod": confidence_note
    }


ZONE_PRESETS = {
    "Nose": (2.7, 0.05, 0.0),
    "Forward Fuselage Zone": (1.7, 0.05, 0.0),
    "Mid Fuselage Zone": (0.2, 0.05, 0.0),
    "Rear Fuselage Zone": (-1.4, 0.05, 0.0),
    "Left Wing": (0.0, 0.05, 1.7),
    "Right Wing": (0.0, 0.05, -1.7),
    "Tail": (-2.3, 0.25, 0.0),
    "Engine": (0.1, -0.25, 1.1),
}


def preset_zone(name, confidence_note="rule_based"):
    """
    Returns one of the predefined aircraft zones.
    """
    x, y, z = ZONE_PRESETS[name]
    return make_zone(name, name, x, y, z, confidence_note)


def clamp01(value):
    """
    Keeps bbox center values between 0 and 1.
    """
    try:
        value = float(value)
    except Exception:
        return 0.5

    return max(0.0, min(value, 1.0))


def map_damage_to_zone(view="right", bbox_center_x=0.5, bbox_center_y=0.5):
    """
    Maps 2D image detection center to an approximate 3D aircraft zone.

    Inputs:
    - view: front, back, left, right, top, bottom, unknown
    - bbox_center_x: normalized x center from 0 to 1
    - bbox_center_y: normalized y center from 0 to 1

    Output:
    - zone
    - zoneLabel
    - position3d
    - mappingMethod

    Notes:
    This is approximate zone-based mapping, not true camera-pose
    2D-to-3D projection. It is designed for the current project
    prototype and should be described as Zone-Based Mapping V1.1.
    """

    view = str(view).lower().strip()
    x = clamp01(bbox_center_x)
    y = clamp01(bbox_center_y)

    # ============================================================
    # GENERIC / UNKNOWN IMAGE VIEW
    # ============================================================
    # For unknown or close-up images, do NOT guess wing aggressively.
    # Most close-up aircraft-surface images are fuselage/body/door/panel.
    if view in {"image", "unknown", "", "auto"}:
        if y < 0.22:
            return make_zone(
                "upper_fuselage",
                "Upper Fuselage Zone",
                0.2, 0.55, 0.0,
                confidence_note="fallback_conservative"
            )

        if y > 0.78:
            return make_zone(
                "lower_fuselage",
                "Belly / Lower Fuselage Zone",
                0.2, -0.45, 0.0,
                confidence_note="fallback_conservative"
            )

        if x < 0.25:
            return make_zone(
                "rear_fuselage",
                "Estimated Rear Fuselage Zone",
                -1.4, 0.05, 0.0,
                confidence_note="fallback_conservative"
            )

        if x > 0.75:
            return make_zone(
                "forward_fuselage",
                "Estimated Forward Fuselage Zone",
                1.7, 0.05, 0.0,
                confidence_note="fallback_conservative"
            )

        return make_zone(
            "mid_fuselage",
            "Mid Fuselage / Body Zone",
            0.2, 0.05, 0.0,
            confidence_note="fallback_conservative"
        )

    # ============================================================
    # FRONT VIEW
    # ============================================================
    if view == "front":
        if y < 0.28:
            return make_zone(
                "nose",
                "Nose Zone",
                2.7, 0.05, 0.0
            )

        if x < 0.32:
            return make_zone(
                "left_engine",
                "Left Engine / Left Wing Root Zone",
                0.1, -0.25, 1.1
            )

        if x > 0.68:
            return make_zone(
                "right_engine",
                "Right Engine / Right Wing Root Zone",
                0.1, -0.25, -1.1
            )

        if y > 0.68:
            return make_zone(
                "lower_forward_fuselage",
                "Lower Forward Fuselage Zone",
                1.7, -0.15, 0.0
            )

        return make_zone(
            "forward_fuselage",
            "Forward Fuselage Zone",
            1.7, 0.05, 0.0
        )

    # ============================================================
    # BACK VIEW
    # ============================================================
    if view == "back":
        if y < 0.30:
            return make_zone(
                "tail",
                "Tail Zone",
                -2.3, 0.25, 0.0
            )

        if x < 0.28:
            return make_zone(
                "left_wing",
                "Left Wing Zone",
                0.0, 0.05, 1.7
            )

        if x > 0.72:
            return make_zone(
                "right_wing",
                "Right Wing Zone",
                0.0, 0.05, -1.7
            )

        if y > 0.68:
            return make_zone(
                "rear_lower_fuselage",
                "Rear Lower Fuselage Zone",
                -1.4, -0.15, 0.0
            )

        return make_zone(
            "rear_fuselage",
            "Rear Fuselage Zone",
            -1.4, 0.05, 0.0
        )

    # ============================================================
    # LEFT SIDE VIEW
    # ============================================================
    if view == "left":
        # Far left in left-side image usually means tail area.
        if x < 0.18:
            return make_zone(
                "tail",
                "Tail / Vertical Stabilizer Zone",
                -3.2, 0.55, 0.0
            )

        # Far right in left-side image usually means nose area.
        if x > 0.82:
            return make_zone(
                "nose",
                "Nose / Forward Section Zone",
                3.2, 0.25, 0.0
            )

        # Upper image region = top fuselage.
        if y < 0.25:
            return make_zone(
                "upper_fuselage",
                "Upper Fuselage Zone",
                0.4, 0.55, 0.0
            )

        # Very low image region = belly / lower fuselage.
        if y > 0.76:
            return make_zone(
                "belly",
                "Belly / Lower Fuselage Zone",
                0.2, -0.45, 0.0
            )

        # Wing should only be selected when detection is lower-middle,
        # not central door/fuselage close-up.
        if 0.35 <= x <= 0.70 and 0.58 <= y <= 0.76:
            return make_zone(
                "left_wing",
                "Left Wing / Wing Root Zone",
                0.8, -0.10, 1.20,
                confidence_note="side_view_wing_root_rule"
            )

        # Most central side-view detections are fuselage/door/panel.
        if 0.28 <= x <= 0.72 and 0.30 <= y <= 0.72:
            return make_zone(
                "left_fuselage_door_area",
                "Left Fuselage / Door Area",
                0.2, 0.05, 0.75,
                confidence_note="side_view_fuselage_priority"
            )

        return make_zone(
            "left_fuselage",
            "Left Fuselage Side Zone",
            0.2, 0.05, 0.75
        )

    # ============================================================
    # RIGHT SIDE VIEW
    # ============================================================
    if view == "right":
        # Far left in right-side image usually means tail area.
        if x < 0.18:
            return make_zone(
                "tail",
                "Tail / Vertical Stabilizer Zone",
                -3.2, 0.55, 0.0
            )

        # Far right in right-side image usually means nose area.
        if x > 0.82:
            return make_zone(
                "nose",
                "Nose / Forward Section Zone",
                3.2, 0.25, 0.0
            )

        # Upper image region = top fuselage.
        if y < 0.25:
            return make_zone(
                "upper_fuselage",
                "Upper Fuselage Zone",
                0.4, 0.55, 0.0
            )

        # Very low image region = belly / lower fuselage.
        if y > 0.76:
            return make_zone(
                "belly",
                "Belly / Lower Fuselage Zone",
                0.2, -0.45, 0.0
            )

        # Wing should only be selected when detection is lower-middle,
        # not central door/fuselage close-up.
        if 0.35 <= x <= 0.70 and 0.58 <= y <= 0.76:
            return make_zone(
                "right_wing",
                "Right Wing / Wing Root Zone",
                0.8, -0.10, -1.20,
                confidence_note="side_view_wing_root_rule"
            )

        # Most central side-view detections are fuselage/door/panel.
        if 0.28 <= x <= 0.72 and 0.30 <= y <= 0.72:
            return make_zone(
                "right_fuselage_door_area",
                "Right Fuselage / Door Area",
                0.2, 0.05, -0.75,
                confidence_note="side_view_fuselage_priority"
            )

        return make_zone(
            "right_fuselage",
            "Right Fuselage Side Zone",
            0.2, 0.05, -0.75
        )

    # ============================================================
    # TOP VIEW
    # ============================================================
    if view == "top":
        if x < 0.22:
            return make_zone(
                "tail",
                "Tail Zone",
                -3.0, 0.45, 0.0
            )

        if x > 0.78:
            return make_zone(
                "nose",
                "Nose Zone",
                3.2, 0.25, 0.0
            )

        if y < 0.35:
            return make_zone(
                "left_wing",
                "Left Wing Upper Surface Zone",
                0.7, 0.0, 1.25
            )

        if y > 0.65:
            return make_zone(
                "right_wing",
                "Right Wing Upper Surface Zone",
                0.7, 0.0, -1.25
            )

        return make_zone(
            "upper_fuselage",
            "Upper Fuselage Zone",
            0.2, 0.55, 0.0
        )

    # ============================================================
    # BOTTOM VIEW
    # ============================================================
    if view == "bottom":
        if x < 0.25:
            return make_zone(
                "aft_belly",
                "Aft Belly Zone",
                -2.0, -0.55, 0.0
            )

        if x > 0.75:
            return make_zone(
                "forward_belly",
                "Forward Belly Zone",
                2.0, -0.55, 0.0
            )

        if y < 0.35:
            return make_zone(
                "left_wing_lower_surface",
                "Left Wing Lower Surface Zone",
                0.5, -0.10, 1.25
            )

        if y > 0.65:
            return make_zone(
                "right_wing_lower_surface",
                "Right Wing Lower Surface Zone",
                0.5, -0.10, -1.25
            )

        return make_zone(
            "belly",
            "Belly / Lower Fuselage Zone",
            0.1, -0.55, 0.0
        )

    # ============================================================
    # UNKNOWN VIEW FALLBACK
    # ============================================================
    if x < 0.25:
        return make_zone(
            "aft_fuselage",
            "Estimated Aft Fuselage Zone",
            -2.0, 0.0, 0.0,
            confidence_note="fallback_rule_based"
        )

    if x > 0.75:
        return make_zone(
            "forward_fuselage",
            "Estimated Forward Fuselage Zone",
            2.0, 0.0, 0.0,
            confidence_note="fallback_rule_based"
        )

    return make_zone(
        "unknown",
        "Unknown Aircraft Zone",
        0.0, 0.0, 0.0,
        confidence_note="fallback_unknown"
    )