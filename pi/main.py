import logging
from datetime import timezone
from typing import Optional

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, field_validator

import config
from gps_store import gps_store
from print_flow import run_print_flow
from gpio_handler import setup_gpio, cleanup_gpio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()


@app.on_event("startup")
async def on_startup() -> None:
    setup_gpio()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    cleanup_gpio()


class GpsPayload(BaseModel):
    latitude: float
    longitude: float
    timestamp: Optional[str] = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError("latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError("longitude must be between -180 and 180")
        return v


@app.post("/gps")
async def post_gps(payload: GpsPayload) -> dict:
    stored_at = gps_store.update(payload.latitude, payload.longitude)
    stored_at_iso = stored_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    logger.info(
        "GPS_UPDATED lat=%s lon=%s storedAt=%s",
        payload.latitude,
        payload.longitude,
        stored_at_iso,
    )
    return {"ok": True, "storedAt": stored_at_iso}


@app.get("/health")
async def get_health() -> dict:
    age = gps_store.age_seconds()
    has_gps = age is not None
    return {
        "ok": True,
        "hasGps": has_gps,
        "latestGpsAgeSeconds": round(age, 2) if age is not None else None,
    }


@app.post("/print")
async def post_print() -> dict:
    await run_print_flow()
    return {"ok": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PI_PORT, reload=False)
