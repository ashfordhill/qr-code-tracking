import asyncio
import logging
from datetime import datetime, timezone

import requests

import config
from zpl import generate_zpl
from printer import send_to_printer

logger = logging.getLogger(__name__)

_print_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def run_print_flow() -> None:
    if _print_lock.locked():
        logger.info("PRINT_SKIPPED", extra={"reason": "print already in progress", "time": _now_iso()})
        return

    async with _print_lock:
        await asyncio.get_event_loop().run_in_executor(None, _blocking_print_flow)


def _blocking_print_flow() -> None:
    # Step 1: Fetch latest GPS from cloud
    try:
        gps_response = requests.get(
            f"{config.BACKEND_URL}/api/gps/latest",
            headers={"x-api-key": config.API_KEY},
            timeout=10,
        )
        gps_response.raise_for_status()
        gps_data = gps_response.json()
    except requests.RequestException as exc:
        logger.error("NO_GPS_AVAILABLE", extra={"error": str(exc), "time": _now_iso()})
        return

    latitude = gps_data.get("latitude")
    longitude = gps_data.get("longitude")
    stored_at = gps_data.get("storedAt")

    if latitude is None or longitude is None or stored_at is None:
        logger.error("NO_GPS_AVAILABLE", extra={"response": gps_data, "time": _now_iso()})
        return

    # Step 2: Validate freshness
    try:
        stored_dt = datetime.fromisoformat(stored_at.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - stored_dt).total_seconds()
    except (ValueError, AttributeError):
        logger.error("NO_GPS_AVAILABLE", extra={"reason": "invalid storedAt", "storedAt": stored_at, "time": _now_iso()})
        return

    if age > config.GPS_STALE_THRESHOLD_SECONDS:
        logger.error("GPS_STALE", extra={"ageSeconds": round(age, 2), "time": _now_iso()})
        return

    # Step 3: Call backend to create label
    try:
        response = requests.post(
            f"{config.BACKEND_URL}/api/labels",
            json={
                "latitude": latitude,
                "longitude": longitude,
                "source": config.SOURCE_ID,
            },
            headers={
                "Content-Type": "application/json",
                "x-api-key": config.API_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.error("BACKEND_REQUEST_FAILED", extra={"error": str(exc), "time": _now_iso()})
        return

    # Step 4: Validate response
    url = data.get("url") if isinstance(data, dict) else None
    slug = data.get("slug") if isinstance(data, dict) else None
    if not url:
        logger.error("BACKEND_INVALID_RESPONSE", extra={"response": data, "time": _now_iso()})
        return

    # Step 5: Generate ZPL locally
    zpl = generate_zpl(url)

    # Step 6: Send to printer
    try:
        send_to_printer(zpl)
    except OSError as exc:
        logger.error("PRINTER_SEND_FAILED", extra={"error": str(exc), "url": url, "time": _now_iso()})
        return

    # Step 7: Log success
    logger.info(
        "PRINT_SUCCESS",
        extra={
            "slug": slug,
            "url": url,
            "latitude": latitude,
            "longitude": longitude,
            "gpsAgeSeconds": round(age, 2),
            "time": _now_iso(),
        },
    )
