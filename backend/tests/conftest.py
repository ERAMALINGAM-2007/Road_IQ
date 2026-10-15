"""Backend test configuration."""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure marga project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app
from backend.app.core.database import init_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
