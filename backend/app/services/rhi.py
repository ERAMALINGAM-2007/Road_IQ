"""
backend/app/services/rhi.py — Road Health Index (RHI) Calculation Engine

Implements the official RHI formula from SPEC §8.3:
RHI = 100 - min(100, sum(penalty_i))
Grades: A (>=85), B (>=70), C (>=55), D (>=40), F (<40).
"""

from typing import List, Dict, Any, Tuple
from backend.app.core.config import settings


def calculate_segment_rhi(
    defects: List[Dict[str, Any]],
    segment_length_m: float = 500.0,
) -> Dict[str, Any]:
    """
    Computes RHI score and grade for a road segment based on contained defects.
    """
    cfg = settings.SCORING.get("rhi", {})
    penalties = cfg.get("penalty", {
        "low": 2.0,
        "medium": 5.0,
        "high": 12.0,
        "critical": 25.0,
    })
    cap_mult = float(cfg.get("area_multiplier_cap", 3.0))

    total_penalty = 0.0
    defect_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}

    for d in defects:
        band = d.get("severity_band", "low").lower()
        base_p = penalties.get(band, 2.0)
        defect_counts[band] = defect_counts.get(band, 0) + 1

        # Physical area scaling relative to segment length
        area = float(d.get("est_area_m2", 0.15))
        area_mult = min(cap_mult, max(1.0, (area / 0.20)))
        total_penalty += base_p * area_mult

    total_penalty = min(100.0, total_penalty)
    rhi_score = round(max(0.0, 100.0 - total_penalty), 1)

    # Grading
    if rhi_score >= 85.0:
        grade = "A"
    elif rhi_score >= 70.0:
        grade = "B"
    elif rhi_score >= 55.0:
        grade = "C"
    elif rhi_score >= 40.0:
        grade = "D"
    else:
        grade = "F"

    return {
        "rhi_score": rhi_score,
        "rhi_grade": grade,
        "total_penalty": round(total_penalty, 1),
        "defect_count": len(defects),
        "defect_breakdown": defect_counts,
        "segment_length_m": segment_length_m,
    }
