from fastapi import APIRouter

from app.config import settings
from app.db import get_pool
from app.db.schema_check import verify_schema

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready() -> dict[str, object]:
    pool = await get_pool()
    schema = await verify_schema(pool, settings.opc_schema_version)
    return {"status": "ok", "schema": schema}
