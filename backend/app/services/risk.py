"""
backend/app/services/risk.py — Multi-Factor Risk Prioritisation Engine

Implements the official 5-factor risk formulation from SPEC §8.2:
R = 100 * (0.40*S' + 0.20*E + 0.15*V + 0.15*G + 0.10*T)

Features:
- Dynamic weight renormalisation when contextual telemetry is absent.
- Full mathematical breakdown dictionary for explainability waterfall charts.
- Natural-language template summary generator.
"""

from typing import Dict, Any, Optional
from backend.app.core.config import settings


def calculate_risk(
    severity_score: float,
    exposure_score: float,
    vulnerability_score: float,
    observation_count: int = 1,
    days_unrepaired: int = 0,
    rainfall_last_72h_mm: Optional[float] = None,
    area_growth_m2: float = 0.0,
    two_wheeler_heavy: bool = False,
) -> Dict[str, Any]:
    """
    Computes explainable Risk Score R in [0.0, 100.0].
    """
    cfg = settings.SCORING.get("risk", {})
    weights = cfg.get("weights", {
        "severity": 0.40,
        "exposure": 0.20,
        "vulnerability": 0.15,
        "persistence": 0.15,
        "time_weather": 0.10,
    })

    # Normalized Severity S'
    s_norm = max(0.0, min(1.0, severity_score / 100.0))

    # Exposure E [0, 1]
    e_val = max(0.0, min(1.0, exposure_score))

    # Vulnerability V [0, 1] with optional 2-wheeler boost (common in Tamil Nadu)
    v_val = max(0.0, min(1.0, vulnerability_score * (1.20 if two_wheeler_heavy else 1.0)))

    # Persistence G [0, 1] (observation count saturating at 10, days since first seen, growth)
    p_cfg = cfg.get("persistence", {})
    obs_sat = float(p_cfg.get("obs_saturation_n", 10))
    days_sat = float(p_cfg.get("days_saturation", 90))
    g_val = (
        0.50 * min(1.0, observation_count / obs_sat) +
        0.40 * min(1.0, days_unrepaired / days_sat) +
        0.10 * min(1.0, area_growth_m2 / 0.5)
    )
    g_val = max(0.0, min(1.0, g_val))

    # Time & Weather T [0, 1]
    context_notes = []
    if rainfall_last_72h_mm is not None:
        tw_cfg = cfg.get("time_weather", {})
        rain_sat = float(tw_cfg.get("rain_saturation_mm", 40.0))
        days_unrep_sat = float(tw_cfg.get("days_unrepaired_saturation", 60.0))
        t_val = (
            0.60 * min(1.0, days_unrepaired / days_unrep_sat) +
            0.40 * min(1.0, rainfall_last_72h_mm / rain_sat)
        )
        t_val = max(0.0, min(1.0, t_val))
    else:
        t_val = None
        context_notes.append("context_unavailable: weather")

    # Weights and renormalisation
    w_s = weights.get("severity", 0.40)
    w_e = weights.get("exposure", 0.20)
    w_v = weights.get("vulnerability", 0.15)
    w_g = weights.get("persistence", 0.15)
    w_t = weights.get("time_weather", 0.10) if t_val is not None else 0.0

    total_weight = w_s + w_e + w_v + w_g + w_t
    w_s /= total_weight
    w_e /= total_weight
    w_v /= total_weight
    w_g /= total_weight
    w_t = (w_t / total_weight) if t_val is not None else 0.0

    contrib_s = round(w_s * s_norm * 100.0, 2)
    contrib_e = round(w_e * e_val * 100.0, 2)
    contrib_v = round(w_v * v_val * 100.0, 2)
    contrib_g = round(w_g * g_val * 100.0, 2)
    contrib_t = round(w_t * (t_val or 0.0) * 100.0, 2)

    risk_raw = contrib_s + contrib_e + contrib_v + contrib_g + contrib_t
    risk_score = round(max(0.0, min(100.0, risk_raw)), 1)

    # Risk level classification
    if risk_score >= 75.0:
        level = "critical"
    elif risk_score >= 50.0:
        level = "high"
    elif risk_score >= 25.0:
        level = "medium"
    else:
        level = "low"

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "breakdown": {
            "severity_points": contrib_s,
            "exposure_points": contrib_e,
            "vulnerability_points": contrib_v,
            "persistence_points": contrib_g,
            "weather_time_points": contrib_t,
        },
        "factors": {
            "severity_norm": round(s_norm, 3),
            "exposure": round(e_val, 3),
            "vulnerability": round(v_val, 3),
            "persistence": round(g_val, 3),
            "time_weather": round(t_val, 3) if t_val is not None else None,
        },
        "context_notes": context_notes,
    }
