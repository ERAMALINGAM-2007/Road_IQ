"""
backend/app/core/config.py — Central Configuration & Domain YAML Loaders

Loads YAML configuration files (scoring, repairs, roads, settings) and defines
system-wide constants and filesystem paths.
"""

import os
from pathlib import Path
from typing import Dict, Any
import yaml

# Base paths
APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
UPLOADS_DIR = DATA_DIR / "uploads"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


def load_yaml(file_name: str) -> Dict[str, Any]:
    file_path = CONFIG_DIR / file_name
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


class Settings:
    PROJECT_NAME: str = "Marga API"
    VERSION: str = "0.1.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT}/marga.db")
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("1", "true", "yes")

    # Domain configurations loaded from YAML
    SCORING: Dict[str, Any] = load_yaml("scoring.yaml")
    REPAIRS: Dict[str, Any] = load_yaml("repairs.yaml")
    ROADS: Dict[str, Any] = load_yaml("roads.yaml")
    GLOBAL: Dict[str, Any] = load_yaml("settings.yaml")


settings = Settings()
