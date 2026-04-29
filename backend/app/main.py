from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, kg, search, stats
from app.config import settings
from app.db import close_pool, get_pool
from app.db.schema_check import verify_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_pool()
    await verify_schema(pool, settings.opc_schema_version)
    yield
    await close_pool()


app = FastAPI(
    title="OPC Dashboard API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(kg.router, prefix="/api")
app.include_router(search.router, prefix="/api")
