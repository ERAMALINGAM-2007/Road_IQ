"""
backend/app/services/severity.py — Severity Scoring Engine for Marga

Implements the deterministic severity equation from SPEC §8.1 and config/scoring.yaml:
S = 100 * clamp(wA*A + wC*C + wP*P + wD*D) + waterBonus

Returns:
- Numeric score (0.0 to 100.0)
- Band: 'low', 'medium', 'high', 'critical'
- Component breakdown contributions for the explainability waterfall chart
- Active safety overrides triggered
"""

import math
from typing import Dict, Any, Optional
from backend.app.core.config import settings


def squash_area(area_m2: float, k: float = 4.0, x0: float = 0.5, max_area: float = 2.0) -> float:
    """Logistic normalization of physical defect area (m^2) into [0.0, 1.0]."""
    if area_m2 <= 0.0:
        return 0.0
    if area_m2 >= max_area:
        return 1.0
    # Sigmoid: 1 / (1 + exp(-k * (x - x0)))
    val = 1.0 / (1.0 + math.exp(-k * (area_m2 - x0)))
    # Scale so that 0 area is 0
    zero_offset = 1.0 / (1.0 + math.exp(-k * (0.0 - x0)))
    scaled = (val - zero_offset) / (1.0 - zero_offset)
    return max(0.0, min(1.0, scaled))


def calculate_severity(
    class_name: str,
    estimated_area_m2: float,
    lane_position: str = "wheel_path",
    is_waterlogged: bool = False,
    depth_index: Optional[float] = None,
    estimated_width_cm: Optional[float] = None,
    road_speed_limit_kmh: int = 60,
    dense_alligator_coverage: float = 0.0,
) -> Dict[str, Any]:
    """
    Compute explainable severity score, category band, and breakdown.
    """
    cfg = settings.SCORING.get("severity", {})
    weights = cfg.get("weights", {"area": 0.35, "class": 0.35, "position": 0.20, "depth": 0.10})
    class_weights = cfg.get("class_weights", {
        "pothole": 1.00,
        "surface_damage": 0.80,
        "transverse_crack": 0.50,
        "longitudinal_crack": 0.35,
    })
    pos_weights = cfg.get("position_weights", {
        "wheel_path": 1.00,
        "lane_edge": 0.70,
        "shoulder": 0.40,
        "unknown": 0.70,
    })
    water_bonus_val = float(cfg.get("water_bonus", 8.0))

    # 1. Component Values [0, 1]
    norm_area = squash_area(estimated_area_m2)
    cls_weight = class_weights.get(class_name.lower(), 0.50)
    pos_weight = pos_weights.get(lane_position.lower(), 0.70)

    # 2. Renormalize weights if depth is absent (P0/P1)
    w_a = weights.get("area", 0.35)
    w_c = weights.get("class", 0.35)
    w_p = weights.get("position", 0.20)
    w_d = weights.get("depth", 0.10) if depth_index is not None else 0.0

    total_weight = w_a + w_c + w_p + w_d
    w_a /= total_weight
    w_c /= total_weight
    w_p /= total_weight
    w_d /= total_weight

    # 3. Base Score
    contrib_area = round(w_a * norm_area * 100.0, 2)
    contrib_class = round(w_c * cls_weight * 100.0, 2)
    contrib_position = round(w_p * pos_weight * 100.0, 2)
    contrib_depth = round(w_d * (depth_index or 0.0) * 100.0, 2) if depth_index is not None else 0.0
    contrib_water = water_bonus_val if is_waterlogged else 0.0

    raw_score = contrib_area + contrib_class + contrib_position + contrib_depth + contrib_water
    score = max(0.0, min(100.0, raw_score))

    # 4. Safety Overrides
    overrides_triggered = []
    # Pothole > 30cm on high-speed road
    width = estimated_width_cm if estimated_width_cm is not None else (math.sqrt(estimated_area_m2) * 100.0)
    if class_name.lower() == "pothole" and width >= 30.0 and road_speed_limit_kmh >= 60:
        if score < 50.0:
            score = 50.0
            overrides_triggered.append("pothole_on_fast_road (elevated to High ≥50)")
        else:
            overrides_triggered.append("pothole_on_fast_road (enforced High threshold ≥50)")

    # Dense alligator cracking
    if class_name.lower() == "surface_damage" and dense_alligator_coverage >= 0.40:
        if score < 50.0:
            score = 50.0
            overrides_triggered.append("dense_alligator_coverage (elevated to High ≥50)")
        else:
            overrides_triggered.append("dense_alligator_coverage (enforced High threshold ≥50)")

    score = round(score, 1)

    # 5. Severity Band
    if score >= 75.0:
        band = "critical"
    elif score >= 50.0:
        band = "high"
    elif score >= 25.0:
        band = "medium"
    else:
        band = "low"

    return {
        "score": score,
        "band": band,
        "breakdown": {
            "area_contribution": contrib_area,
            "class_contribution": contrib_class,
            "position_contribution": contrib_position,
            "depth_contribution": contrib_depth,
            "water_bonus": contrib_water,
        },
        "overrides": overrides_triggered,
        "inputs": {
            "class_name": class_name,
            "estimated_area_m2": estimated_area_m2,
            "lane_position": lane_position,
            "is_waterlogged": is_waterlogged,
            "width_cm": round(width, 1),
        },
    }
