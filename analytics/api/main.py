"""FastAPI Application Entry Point for MatsyaMitra API."""

from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analytics.api.routes import router as api_v1_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="MatsyaMitra API",
    description="Coastal Decision Support & Potential Fishing Zone (PFZ) API for Karnataka",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
