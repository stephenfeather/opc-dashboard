from fastapi import APIRouter, Depends

from app.auth import require_token
from app.db import get_pool

router = APIRouter(prefix="/stats", tags=["stats"], dependencies=[Depends(require_token)])


@router.get("/memory")
async def memory_stats() -> dict[str, object]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM archival_memory")
        by_type = await conn.fetch(
            "SELECT COALESCE(metadata->>'learning_type', 'unknown') AS learning_type, "
            "COUNT(*) AS n "
            "FROM archival_memory "
            "GROUP BY learning_type ORDER BY n DESC"
        )
        kg_counts = await conn.fetchrow(
            "SELECT "
            "(SELECT COUNT(*) FROM kg_entities) AS entities, "
            "(SELECT COUNT(*) FROM kg_edges) AS edges, "
            "(SELECT COUNT(*) FROM kg_entity_mentions) AS mentions"
        )
    return {
        "memories_total": total,
        "memories_by_type": [dict(r) for r in by_type],
        "kg": dict(kg_counts) if kg_counts else {},
    }
