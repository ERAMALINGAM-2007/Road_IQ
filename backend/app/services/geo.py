"""
backend/app/services/geo.py — Geographical Intelligence & Asset Exposure

Provides:
- Haversine distance computations.
- Road class exposure scoring (E) based on OSM highway attributes and speed limits.
- Vulnerability scoring (V) based on proximity to sensitive pedestrian/traffic POIs
  (schools, hospitals, transit stops, markets) within 150m.
- Pre-cached road corridors and POIs for Perundurai, Erode (SDG 11 reference region).
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from backend.app.core.config import settings

# Sensitive infrastructure POIs in Perundurai / KEC vicinity
PERUNDURAI_POIS = [
    {"name": "Kongu Engineering College Main Gate", "type": "school", "lat": 11.2740, "lon": 77.6070},
    {"name": "Government Higher Secondary School Perundurai", "type": "school", "lat": 11.2765, "lon": 77.5850},
    {"name": "Perundurai Government Hospital", "type": "hospital", "lat": 11.2780, "lon": 77.5810},
    {"name": "Perundurai Old Bus Stand", "type": "bus_stop", "lat": 11.2745, "lon": 77.5835},
    {"name": "Perundurai New Bus Stand (NH-544)", "type": "bus_stop", "lat": 11.2690, "lon": 77.5895},
    {"name": "Weekly Vegetable Market Perundurai", "type": "marketplace", "lat": 11.2755, "lon": 77.5820},
    {"name": "Pedestrian Crossing NH-544 Km 43", "type": "crossing", "lat": 11.2715, "lon": 77.5865},
]

# Baseline road corridor segments
PERUNDURAI_CORRIDORS = [
    {
        "id": "nh544_trunk",
        "name": "NH-544 Salem-Kochi Highway",
        "highway_class": "trunk",
        "speed_limit_kmh": 80,
        "coords": [(11.2650, 77.5750), (11.2720, 77.5850), (11.2800, 77.5980)],
    },
    {
        "id": "sh96_primary",
        "name": "SH-96 Perundurai - Erode Road",
        "highway_class": "primary",
        "speed_limit_kmh": 60,
        "coords": [(11.2740, 77.5830), (11.2790, 77.6000), (11.2850, 77.6200)],
    },
    {
        "id": "kec_secondary",
        "name": "KEC Campus Road (Thoppupalayam)",
        "highway_class": "secondary",
        "speed_limit_kmh": 40,
        "coords": [(11.2720, 77.6020), (11.2750, 77.6075), (11.2780, 77.6120)],
    },
]


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in metres."""
    r = 6371000.0  # Earth radius in metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def get_road_exposure(lat: float, lon: float) -> Dict[str, Any]:
    """
    Computes Exposure factor E in [0.0, 1.0] based on road class and speed limit.
    """
    # Find nearest corridor
    best_dist = float("inf")
    matched_corridor = PERUNDURAI_CORRIDORS[0]
    for corr in PERUNDURAI_CORRIDORS:
        for c_lat, c_lon in corr["coords"]:
            d = haversine_distance_m(lat, lon, c_lat, c_lon)
            if d < best_dist:
                best_dist = d
                matched_corridor = corr

    h_class = matched_corridor["highway_class"]
    speed_kmh = matched_corridor["speed_limit_kmh"]

    cfg = settings.SCORING.get("risk", {}).get("exposure", {})
    class_weights = cfg.get("highway_class", {
        "trunk": 1.00,
        "primary": 0.90,
        "secondary": 0.75,
        "tertiary": 0.60,
        "residential": 0.40,
    })

    base_exposure = class_weights.get(h_class, 0.70)

    # Speed factor adjustment
    speed_cfg = cfg.get("speed_factor", {"base_speed_kmh": 50, "scale": 0.005})
    speed_delta = max(0, speed_kmh - 30)
    speed_multiplier = min(1.25, 1.0 + speed_delta * speed_cfg.get("scale", 0.005))

    # Junction bump if near intersection
    junction_bump = 0.08 if best_dist < 45.0 else 0.0

    raw_e = (base_exposure * speed_multiplier) + junction_bump
    exposure_score = max(0.0, min(1.0, round(raw_e, 3)))

    return {
        "exposure_score": exposure_score,
        "road_name": matched_corridor["name"],
        "highway_class": h_class,
        "speed_limit_kmh": speed_kmh,
        "junction_bump": junction_bump > 0,
    }


def get_vulnerability(lat: float, lon: float) -> Dict[str, Any]:
    """
    Computes Vulnerability factor V in [0.0, 1.0] based on POI distance decay.
    V = base * exp(-lambda * distance_m) for POIs within 150m.
    """
    v_cfg = settings.SCORING.get("risk", {}).get("vulnerability", {})
    search_radius = float(v_cfg.get("search_radius_m", 150.0))
    decay_lambda = float(v_cfg.get("decay_lambda", 0.02))
    poi_weights = v_cfg.get("poi_types", {
        "school": 1.00,
        "hospital": 1.00,
        "bus_stop": 0.70,
        "marketplace": 0.50,
        "crossing": 0.60,
    })

    best_v = 0.0
    nearest_poi = None
    nearest_dist = float("inf")

    for poi in PERUNDURAI_POIS:
        dist = haversine_distance_m(lat, lon, poi["lat"], poi["lon"])
        if dist < nearest_dist:
            nearest_dist = dist
            nearest_poi = poi

        if dist <= search_radius:
            base_w = poi_weights.get(poi["type"], 0.50)
            score = base_w * math.exp(-decay_lambda * dist)
            if score > best_v:
                best_v = score

    return {
        "vulnerability_score": round(best_v, 3),
        "nearest_poi": nearest_poi["name"] if nearest_poi else None,
        "distance_m": round(nearest_dist, 1) if nearest_dist != float("inf") else None,
        "is_pedestrian_zone": best_v >= 0.35,
    }
