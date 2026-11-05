import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import async_session_maker, engine
from app.services.reminder_worker import run_reminder_worker


@asynccontextmanager
async def lifespan(_app: FastAPI):
    worker = None
    if settings.reminder_worker_enabled:
        worker = asyncio.create_task(run_reminder_worker(async_session_maker))
    try:
        yield
    finally:
        if worker is not None:
            worker.cancel()
            try:
                await worker
            except asyncio.CancelledError:
                pass


app = FastAPI(title="Todoist Clone API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Todoist Clone API - see /docs"}


@app.get("/api/v1/health")
async def health():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ok"}
