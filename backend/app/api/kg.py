from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import require_token
from app.db import get_pool

router = APIRouter(prefix="/kg", tags=["kg"], dependencies=[Depends(require_token)])


@router.get("/graph")
async def graph(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=500, le=2000),
) -> dict[str, list[dict]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if entity_type:
            nodes = await conn.fetch(
                "SELECT id, display_name, entity_type, mention_count "
                "FROM kg_entities WHERE entity_type = $1 "
                "ORDER BY mention_count DESC LIMIT $2",
                entity_type,
                limit,
            )
        else:
            nodes = await conn.fetch(
                "SELECT id, display_name, entity_type, mention_count "
                "FROM kg_entities ORDER BY mention_count DESC LIMIT $1",
                limit,
            )
        node_ids = [n["id"] for n in nodes]
        edges = await conn.fetch(
            "SELECT source_id, target_id, relation, weight "
            "FROM kg_edges "
            "WHERE source_id = ANY($1::uuid[]) AND target_id = ANY($1::uuid[])",
            node_ids,
        )
    return {
        "nodes": [
            {
                "id": str(n["id"]),
                "label": n["display_name"],
                "type": n["entity_type"],
                "mentions": n["mention_count"],
            }
            for n in nodes
        ],
        "edges": [
            {
                "source": str(e["source_id"]),
                "target": str(e["target_id"]),
                "relation": e["relation"],
                "weight": float(e["weight"]) if e["weight"] is not None else None,
            }
            for e in edges
        ],
    }


@router.get("/entities/{entity_id}")
async def entity_detail(entity_id: UUID) -> dict[str, object]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        entity = await conn.fetchrow(
            "SELECT id, display_name, entity_type, mention_count, metadata "
            "FROM kg_entities WHERE id = $1",
            entity_id,
        )
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entity not found")
        memories = await conn.fetch(
            "SELECT m.memory_id FROM kg_entity_mentions m WHERE m.entity_id = $1 LIMIT 100",
            entity_id,
        )
    return {
        "entity": dict(entity),
        "memories": [str(m["memory_id"]) for m in memories],
    }
