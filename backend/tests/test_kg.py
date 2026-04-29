def test_kg_graph_requires_auth(client):
    response = client.get("/api/kg/graph")
    assert response.status_code == 401


def test_kg_graph_returns_nodes_and_edges(client, auth):
    response = client.get("/api/kg/graph?limit=10", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert "nodes" in body
    assert "edges" in body
    assert isinstance(body["nodes"], list)
    assert isinstance(body["edges"], list)
    assert len(body["nodes"]) <= 10
    if body["nodes"]:
        n = body["nodes"][0]
        assert {"id", "label", "type", "mentions"} <= n.keys()


def test_kg_graph_filters_by_entity_type(client, auth):
    # First find a real entity_type from /graph results
    seed = client.get("/api/kg/graph?limit=5", headers=auth).json()
    if not seed["nodes"]:
        return  # empty KG; nothing to assert
    target_type = seed["nodes"][0]["type"]
    response = client.get(f"/api/kg/graph?entity_type={target_type}&limit=20", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert all(n["type"] == target_type for n in body["nodes"])


def test_kg_entity_detail_not_found(client, auth):
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/api/kg/entities/{fake_uuid}", headers=auth)
    assert response.status_code == 404


def test_kg_entity_detail_invalid_uuid(client, auth):
    response = client.get("/api/kg/entities/not-a-uuid", headers=auth)
    assert response.status_code == 422


def test_kg_entity_detail_existing(client, auth):
    seed = client.get("/api/kg/graph?limit=1", headers=auth).json()
    if not seed["nodes"]:
        return
    entity_id = seed["nodes"][0]["id"]
    response = client.get(f"/api/kg/entities/{entity_id}", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert "entity" in body
    assert "memories" in body
    assert body["entity"]["id"] == entity_id or str(body["entity"]["id"]) == entity_id
