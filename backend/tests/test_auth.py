import pytest
from fastapi import HTTPException

from app.auth import require_token


@pytest.mark.asyncio
async def test_require_token_missing_header():
    with pytest.raises(HTTPException) as exc:
        await require_token(authorization=None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_token_malformed_header():
    with pytest.raises(HTTPException) as exc:
        await require_token(authorization="Token abc")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_token_wrong_token():
    with pytest.raises(HTTPException) as exc:
        await require_token(authorization="Bearer wrong-token")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_token_correct_token():
    # Should not raise
    result = await require_token(authorization="Bearer test-token")
    assert result is None
