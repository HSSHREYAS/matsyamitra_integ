"""FastAPI Application Entry Point for MatsyaMitra API."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analytics.api.routes import router as api_v1_router
from analytics.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start APScheduler on server startup if enabled
    if os.getenv("ENABLE_BACKGROUND_SCHEDULER", "true").lower() == "true":
        try:
            start_scheduler()
        except Exception as exc:
            logging.getLogger("matsyamitra_api").warning("Failed to start scheduler: %s", exc)
    yield
    # Stop APScheduler on server shutdown
    try:
        stop_scheduler()
    except Exception as exc:
        logging.getLogger("matsyamitra_api").warning("Failed to stop scheduler: %s", exc)


app = FastAPI(
    title="MatsyaMitra API",
    description="Coastal Decision Support & Potential Fishing Zone (PFZ) API for Karnataka",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Enable CORS for mobile emulator, localhost, and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/")
def root_redirect():
    return {
        "app": "MatsyaMitra API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
