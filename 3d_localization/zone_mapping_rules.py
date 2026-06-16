"""
Zone mapping reference for SAS 2D-to-3D localization.

The runtime implementation and canonical zone coordinates live in
backend/utils/zone_mapper.py (ZONE_PRESETS). This file re-exports them so
callers in the 3d_localization package use one source of truth.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from utils.zone_mapper import ZONE_PRESETS  # noqa: E402

# Re-export as dict[str, dict] to match the format expected by report utilities.
ZONE_PRESETS_DICT = {
    name: {"x": x, "y": y, "z": z}
    for name, (x, y, z) in ZONE_PRESETS.items()
}


def describe_rule():
    return (
        "Normalized 2D detection centers are mapped into aircraft zones. "
        "Left/right image regions map to wing or fuselage side zones, lower "
        "wing-side detections can map to Engine, central detections map to "
        "fuselage sections, upper/forward detections map to Nose, and lower "
        "rear detections map to Tail."
    )
