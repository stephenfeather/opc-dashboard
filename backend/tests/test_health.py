def test_health_live(client):
    response = client.get("/api/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_ready_reports_schema(client):
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "schema" in body


def test_auth_rejects_missing_token(client):
    response = client.get("/api/stats/memory")
    assert response.status_code == 401


def test_auth_rejects_bad_token(client):
    response = client.get("/api/stats/memory", headers={"Authorization": "Bearer wrong"})
    assert response.status_code == 401


def test_stats_memory_endpoint(client, auth):
    response = client.get("/api/stats/memory", headers=auth)
    assert response.status_code == 200
    body = response.json()

    assert "memories_total" in body
    assert "kg" in body

    assert isinstance(body["memories_by_type"], list)
    if body["memories_by_type"]:
        row = body["memories_by_type"][0]
        assert "learning_type" in row
        assert "n" in row

    kg = body["kg"]
    assert {"entities", "edges", "mentions"} <= kg.keys()
