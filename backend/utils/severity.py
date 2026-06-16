def calculate_severity(damage_type, confidence, area_ratio):
    """
    Calculates aircraft surface damage severity.

    Inputs:
    - damage_type: crack, scratch, dent, corrosion, hole, unknown
    - confidence: model confidence between 0 and 1
    - area_ratio: damage area compared to full image area, between 0 and 1

    Output:
    - Low
    - Medium
    - High

    Notes:
    This is a rule-based severity system.
    Later, when YOLO segmentation masks are ready, area_ratio should come
    from the real mask area instead of only the bounding box area.
    """

    damage_type = str(damage_type).lower().strip()

    # Safety cleanup
    confidence = float(confidence) if confidence is not None else 0.0
    area_ratio = float(area_ratio) if area_ratio is not None else 0.0

    # Keep values in safe range
    confidence = max(0.0, min(confidence, 1.0))
    area_ratio = max(0.0, min(area_ratio, 1.0))

    # --------------------------------------------------------
    # Damage type risk levels
    # --------------------------------------------------------

    critical_types = [
        "crack",
        "stress crack",
        "hole",
        "puncture",
        "tear",
        "fracture",
        "structural crack"
    ]

    high_risk_types = [
        "corrosion",
        "dent",
        "impact",
        "deformation"
    ]

    medium_risk_types = [
        "scratch",
        "paint damage",
        "surface scratch",
        "abrasion"
    ]

    # --------------------------------------------------------
    # Severity logic for critical damage types
    # --------------------------------------------------------

    if any(t in damage_type for t in critical_types):
        if confidence >= 0.90 or area_ratio >= 0.060:
            return "High"

        if confidence >= 0.75 or area_ratio >= 0.030:
            return "Medium"

        return "Low"

    # --------------------------------------------------------
    # Severity logic for high-risk damage types
    # --------------------------------------------------------

    if any(t in damage_type for t in high_risk_types):
        if confidence >= 0.92 or area_ratio >= 0.090:
            return "High"

        if confidence >= 0.80 or area_ratio >= 0.050:
            return "Medium"

        if confidence >= 0.60 or area_ratio >= 0.020:
            return "Medium"

        return "Low"

    # --------------------------------------------------------
    # Severity logic for medium-risk damage types
    # --------------------------------------------------------

    if any(t in damage_type for t in medium_risk_types):
        if area_ratio >= 0.120:
            return "High"

        if confidence >= 0.80 or area_ratio >= 0.040:
            return "Medium"

        return "Low"

    # --------------------------------------------------------
    # General fallback logic
    # --------------------------------------------------------

    if area_ratio >= 0.120:
        return "High"

    if area_ratio >= 0.070:
        return "Medium"

    if area_ratio >= 0.025 or confidence >= 0.75:
        return "Medium"

    return "Low"
