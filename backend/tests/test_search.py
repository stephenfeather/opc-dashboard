def test_search_requires_auth(client):
    response = client.post("/api/search", json={"query": "test"})
    assert response.status_code == 401


def test_search_returns_hits_shape(client, auth):
    response = client.post("/api/search", json={"query": "memory"}, headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "memory"
    assert isinstance(body["hits"], list)
    if body["hits"]:
        hit = body["hits"][0]
        assert {"id", "type", "content", "created_at"} <= hit.keys()


def test_search_respects_limit(client, auth):
    response = client.post("/api/search", json={"query": "the", "limit": 3}, headers=auth)
    assert response.status_code == 200
    assert len(response.json()["hits"]) <= 3


def test_search_filters_by_memory_types(client, auth):
    response = client.post(
        "/api/search",
        json={"query": "the", "memory_types": ["WORKING_SOLUTION"], "limit": 5},
        headers=auth,
    )
    assert response.status_code == 200
    body = response.json()
    for h in body["hits"]:
        assert h["type"] == "WORKING_SOLUTION"


def test_search_validates_empty_query(client, auth):
    response = client.post("/api/search", json={"query": ""}, headers=auth)
    assert response.status_code == 422


def test_search_validates_limit_bounds(client, auth):
    response = client.post("/api/search", json={"query": "x", "limit": 999}, headers=auth)
    assert response.status_code == 422
