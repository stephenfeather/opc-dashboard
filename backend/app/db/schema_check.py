import logging

import asyncpg

logger = logging.getLogger(__name__)

REQUIRED_TABLES = {
    "archival_memory",
    "kg_entities",
    "kg_edges",
    "kg_entity_mentions",
    "sessions",
}


async def verify_schema(pool: asyncpg.Pool, expected_version: str) -> dict[str, object]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public'"
        )
    present = {r["table_name"] for r in rows}
    missing = REQUIRED_TABLES - present

    if missing:
        logger.warning("OPC schema is missing required tables: %s", sorted(missing))

    return {
        "expected_version": expected_version,
        "tables_present": sorted(REQUIRED_TABLES & present),
        "tables_missing": sorted(missing),
    }
