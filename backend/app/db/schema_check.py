import logging

import asyncpg

logger = logging.getLogger(__name__)

REQUIRED_TABLES = {
    "archival_memory",
    "kg_entities",
    "kg_edges",
    "kg_entity_mentions",
    "sessions",
    "settings",
}

SCHEMA_VERSION_KEY = "schema_version"


async def verify_schema(pool: asyncpg.Pool, expected_version: str) -> dict[str, object]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        present = {r["table_name"] for r in rows}

        actual_version: str | None = None
        if "settings" in present:
            actual_version = await conn.fetchval(
                "SELECT value FROM settings WHERE name = $1",
                SCHEMA_VERSION_KEY,
            )

    missing = REQUIRED_TABLES - present
    if missing:
        logger.warning("OPC schema is missing required tables: %s", sorted(missing))

    if actual_version is None:
        logger.warning(
            "OPC settings.%s is unset; expected %s", SCHEMA_VERSION_KEY, expected_version
        )
        version_match = False
    else:
        version_match = actual_version == expected_version
        if not version_match:
            logger.warning(
                "OPC schema version mismatch: expected %s, got %s",
                expected_version,
                actual_version,
            )

    return {
        "expected_version": expected_version,
        "actual_version": actual_version,
        "version_match": version_match,
        "tables_present": sorted(REQUIRED_TABLES & present),
        "tables_missing": sorted(missing),
    }
