"""
backend/app/services/weather.py — Open-Meteo Weather Integration

Queries antecedent precipitation (last 72 hours) and rainfall forecast (next 48 hours)
via the free Open-Meteo API (zero API key required). Caches results in memory and
provides safe fallbacks for offline development and demo presentations.
"""

import time
import json
import urllib.request
import urllib.error
from typing import Dict, Any

# Simple in-memory cache with 1-hour TTL
_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SEC = 3600


def get_weather_context(lat: float = 11.2742, lon: float = 77.5828) -> Dict[str, Any]:
    """
    Retrieve precipitation data for given coordinate.
    Returns:
        dict: {
            'rainfall_last_72h_mm': float,
            'rainfall_forecast_48h_mm': float,
            'source': 'live' | 'cache' | 'fallback',
            'explanation': str
        }
    """
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}"
    now = time.time()

    if cache_key in _WEATHER_CACHE:
        entry = _WEATHER_CACHE[cache_key]
        if now - entry["timestamp"] < CACHE_TTL_SEC:
            return {**entry["data"], "source": "cache"}

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat:.4f}&longitude={lon:.4f}&"
        f"hourly=precipitation&past_days=3&forecast_days=2&timezone=auto"
    )

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Marga-Road-Intelligence/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as response:
            payload = json.loads(response.read().decode("utf-8"))
            hourly_rain = payload.get("hourly", {}).get("precipitation", [])

            # First 72 hours = past 3 days; remaining = next 48 hours
            past_72h = hourly_rain[:72] if len(hourly_rain) >= 72 else hourly_rain
            forecast_48h = hourly_rain[72:120] if len(hourly_rain) > 72 else []

            rain_past = round(sum(p for p in past_72h if p is not None), 1)
            rain_forecast = round(sum(p for p in forecast_48h if p is not None), 1)

            data = {
                "rainfall_last_72h_mm": rain_past,
                "rainfall_forecast_48h_mm": rain_forecast,
                "source": "live",
                "explanation": f"Precipitation: {rain_past} mm recorded in past 72h; {rain_forecast} mm forecast in next 48h.",
            }

            _WEATHER_CACHE[cache_key] = {"timestamp": now, "data": data}
            return data

    except Exception:
        # Graceful fallback: return seasonal Tamil Nadu monsoon baseline
        fallback_data = {
            "rainfall_last_72h_mm": 18.5,
            "rainfall_forecast_48h_mm": 8.0,
            "source": "fallback",
            "explanation": "Offline fallback: using seasonal regional rainfall baseline (18.5 mm / 72h).",
        }
        return fallback_data
