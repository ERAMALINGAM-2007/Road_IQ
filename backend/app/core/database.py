"""
backend/app/core/database.py — SQLite Engine & Session Lifecycle

Manages database connections, ensures SQLite WAL mode for high-throughput
concurrency, and provides the init_db() boot routine.
"""

from typing import Generator
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event
from backend.app.core.config import settings

# Engine setup
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)


# Enable WAL (Write-Ahead Logging) mode on SQLite connections
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def init_db():
    """Create all tables on application startup."""
    from backend.app.models.schema import Survey, Frame, Detection, Defect, WorkOrder, Review, Segment, AuditLog
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency for database session injection."""
    with Session(engine) as session:
        yield session
