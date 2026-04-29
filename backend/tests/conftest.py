import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL", "postgresql://claude:claude_dev@localhost:5432/continuous_claude"
)
os.environ.setdefault("OPC_DASHBOARD_TOKEN", "test-token")


@pytest.fixture
def client():
    # Import inside the fixture so env vars above are applied before app initialization.
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth():
    return {"Authorization": "Bearer test-token"}
