"""
ml/scripts/water_heuristics.py — Water Accumulation & Heuristic Signal Fusion

Evaluates the likelihood of waterlogging / ponding in road defects based on:
1. Antecedent rainfall (last 72 hours from Open-Meteo or sensor logs).
2. Pothole / defect geometry (depth proxy, low-lying road indicator).
3. Visual reflectance heuristic (low texture, dark specularity inside bounding box).

Labelled strictly as EXPERIMENTAL per SPEC §7.4 & §16.
"""

from typing import Dict, Any, Tuple


def evaluate_water_accumulation(
    defect_class: str,
    estimated_area_m2: float,
    rainfall_last_72h_mm: float = 0.0,
    rainfall_forecast_48h_mm: float = 0.0,
    road_elevation_gradient_pct: float = 0.5,
    visual_reflectance_score: float = 0.0,
) -> Dict[str, Any]:
    """
    Compute waterlogging likelihood score (0.0 to 1.0) and whether water is confirmed.

    Returns:
        dict containing:
            - is_waterlogged (bool)
            - water_confidence (float 0..1)
            - severity_bonus (float)
            - experimental_flag (bool): Always True per SPEC §7.4
            - explanation (str)
    """
    # Base risk starts from class susceptibility
    # Potholes and depressed alligator cracking accumulate ponding water rapidly
    class_susceptibility = {
        'pothole': 0.85,
        'surface_damage': 0.50,
        'transverse_crack': 0.20,
        'longitudinal_crack': 0.15,
    }.get(defect_class, 0.20)

    # Rainfall factor: Saturates at 50mm over 72 hours
    rain_score = min(1.0, rainfall_last_72h_mm / 50.0)

    # Road drainage / low-lying depression factor
    drainage_penalty = 1.0 if road_elevation_gradient_pct < 1.0 else 0.5

    # Combined heuristic probability
    combined_score = (
        0.45 * rain_score +
        0.25 * class_susceptibility * drainage_penalty +
        0.30 * visual_reflectance_score
    )
    combined_score = max(0.0, min(1.0, combined_score))

    # Waterlogged threshold: ≥ 0.40 probability indicates standing water or water-filled hazard
    is_waterlogged = combined_score >= 0.40

    # Severity bonus (per config/scoring.yaml water_bonus = 12 points)
    severity_bonus = 12.0 if is_waterlogged else 0.0

    explanation = ""
    if is_waterlogged:
        explanation = (
            f"Experimental waterlogging flag triggered (prob: {combined_score:.2f}). "
            f"Recent precipitation ({rainfall_last_72h_mm:.1f} mm in 72h) creates standing water hazard "
            f"obscuring true defect depth."
        )
    else:
        explanation = "Dry road surface conditions detected; no active water accumulation hazard."

    return {
        'is_waterlogged': is_waterlogged,
        'water_confidence': round(combined_score, 3),
        'severity_bonus': severity_bonus,
        'is_experimental': True,
        'explanation': explanation,
    }


if __name__ == '__main__':
    # Test cases
    test_pothole = evaluate_water_accumulation(
        defect_class='pothole',
        estimated_area_m2=0.35,
        rainfall_last_72h_mm=32.0,
        visual_reflectance_score=0.65
    )
    print("Test Pothole (Rainy):", test_pothole)

    test_crack = evaluate_water_accumulation(
        defect_class='longitudinal_crack',
        estimated_area_m2=0.10,
        rainfall_last_72h_mm=0.0,
        visual_reflectance_score=0.0
    )
    print("Test Crack (Dry):", test_crack)
