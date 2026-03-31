import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class GpsReading:
    latitude: float
    longitude: float
    received_at: datetime


class GpsStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._reading: Optional[GpsReading] = None

    def update(self, latitude: float, longitude: float) -> datetime:
        received_at = datetime.now(timezone.utc)
        with self._lock:
            self._reading = GpsReading(
                latitude=latitude,
                longitude=longitude,
                received_at=received_at,
            )
        return received_at

    def get(self) -> Optional[GpsReading]:
        with self._lock:
            return self._reading

    def age_seconds(self) -> Optional[float]:
        with self._lock:
            if self._reading is None:
                return None
            now = datetime.now(timezone.utc)
            return (now - self._reading.received_at).total_seconds()


gps_store = GpsStore()
