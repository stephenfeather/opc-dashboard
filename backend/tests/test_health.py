import os

os.environ.setdefault("DATABASE_URL", "postgresql://claude:claude_dev@localhost:5432/continuous_claude")
os.environ.setdefault("OPC_DASHBOARD_TOKEN", "test-token")

from fastapi.testclient import TestClient

from app.main import app


def test_health_live():
    with TestClient(app) as client:
        response = client.get("/api/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_health_ready_reports_schema():
    with TestClient(app) as client:
        response = client.get("/api/health/ready")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert "schema" in body


def test_auth_rejects_missing_token():
    with TestClient(app) as client:
        response = client.get("/api/stats/memory")
        assert response.status_code == 401


def test_auth_rejects_bad_token():
    with TestClient(app) as client:
        response = client.get(
            "/api/stats/memory", headers={"Authorization": "Bearer wrong"}
        )
        assert response.status_code == 401


def test_stats_with_token():
    with TestClient(app) as client:
        response = client.get(
            "/api/stats/memory", headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code == 200
        body = response.json()
        assert "memories_total" in body
        assert "kg" in body
