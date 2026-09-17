"""MatsyaMitra API Runner."""

import os
from pathlib import Path
from dotenv import load_dotenv
import uvicorn

load_dotenv(Path(__file__).resolve().parent / ".env")

if __name__ == "__main__":
    host = os.getenv("MATSYAMITRA_API_HOST", "0.0.0.0")
    port = int(os.getenv("MATSYAMITRA_API_PORT", "8000"))
    reload = os.getenv("MATSYAMITRA_API_RELOAD", "false").lower() == "true"

    print(f"Starting MatsyaMitra API server on http://{host}:{port}")
    uvicorn.run("analytics.api.main:app", host=host, port=port, reload=reload)
