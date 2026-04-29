import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql://claude:claude_dev@localhost:5432/continuous_claude"
)
os.environ.setdefault("OPC_DASHBOARD_TOKEN", "test-token")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth():
    return {"Authorization": "Bearer test-token"}
