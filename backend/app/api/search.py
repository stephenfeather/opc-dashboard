from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import require_token
from app.db import get_pool

router = APIRouter(prefix="/search", tags=["search"], dependencies=[Depends(require_token)])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    memory_types: list[str] | None = None
    limit: int = Field(default=20, ge=1, le=100)


@router.post("")
async def search(req: SearchRequest) -> dict[str, object]:
    """v1 stub: simple ILIKE over content. Replace with hybrid RRF + reranker."""
    pool = await get_pool()
    pattern = f"%{req.query}%"
    async with pool.acquire() as conn:
        if req.memory_types:
            rows = await conn.fetch(
                "SELECT id, metadata->>'learning_type' AS learning_type, content, created_at "
                "FROM archival_memory "
                "WHERE content ILIKE $1 "
                "  AND metadata->>'learning_type' = ANY($2::text[]) "
                "  AND superseded_by IS NULL "
                "ORDER BY created_at DESC LIMIT $3",
                pattern,
                req.memory_types,
                req.limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT id, metadata->>'learning_type' AS learning_type, content, created_at "
                "FROM archival_memory "
                "WHERE content ILIKE $1 AND superseded_by IS NULL "
                "ORDER BY created_at DESC LIMIT $2",
                pattern,
                req.limit,
            )
    return {
        "query": req.query,
        "hits": [
            {
                "id": str(r["id"]),
                "type": r["learning_type"],
                "content": r["content"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ],
    }
