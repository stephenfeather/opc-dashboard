import os

os.environ.setdefault("DATABASE_URL", "postgresql://claude:claude_dev@localhost:5432/continuous_claude")
os.environ.setdefault("OPC_DASHBOARD_TOKEN", "test-token")

import pytest

from app.db import close_pool, get_pool
from app.db.schema_check import SCHEMA_VERSION_KEY, verify_schema


@pytest.fixture
async def pool():
    pool = await get_pool()
    yield pool
    await close_pool()


async def _set_setting(pool, name: str, value: str | None) -> str | None:
    async with pool.acquire() as conn:
        prev = await conn.fetchval("SELECT value FROM settings WHERE name = $1", name)
        if value is None:
            await conn.execute("DELETE FROM settings WHERE name = $1", name)
        else:
            await conn.execute(
                "INSERT INTO settings (name, value) VALUES ($1, $2) "
                "ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value",
                name,
                value,
            )
    return prev


@pytest.mark.asyncio
async def test_verify_schema_matches_seeded_version(pool):
    prev = await _set_setting(pool, SCHEMA_VERSION_KEY, "1")
    try:
        result = await verify_schema(pool, "1")
        assert result["actual_version"] == "1"
        assert result["expected_version"] == "1"
        assert result["version_match"] is True
        assert result["tables_missing"] == []
    finally:
        if prev is not None:
            await _set_setting(pool, SCHEMA_VERSION_KEY, prev)


@pytest.mark.asyncio
async def test_verify_schema_flags_mismatch(pool):
    prev = await _set_setting(pool, SCHEMA_VERSION_KEY, "1")
    try:
        result = await verify_schema(pool, "999")
        assert result["actual_version"] == "1"
        assert result["expected_version"] == "999"
        assert result["version_match"] is False
    finally:
        if prev is not None:
            await _set_setting(pool, SCHEMA_VERSION_KEY, prev)


@pytest.mark.asyncio
async def test_verify_schema_flags_unset_version(pool):
    prev = await _set_setting(pool, SCHEMA_VERSION_KEY, None)
    try:
        result = await verify_schema(pool, "1")
        assert result["actual_version"] is None
        assert result["version_match"] is False
    finally:
        if prev is not None:
            await _set_setting(pool, SCHEMA_VERSION_KEY, prev)
