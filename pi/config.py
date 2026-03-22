import os

BACKEND_URL: str = os.environ.get("BACKEND_URL", "https://ashhill.dev")
API_KEY: str = os.environ.get("API_KEY", "")
SOURCE_ID: str = os.environ.get("SOURCE_ID", "pi-01")
GPS_STALE_THRESHOLD_SECONDS: int = int(os.environ.get("GPS_STALE_THRESHOLD_SECONDS", "120"))
PI_PORT: int = int(os.environ.get("PI_PORT", "8000"))
GPIO_PIN: int = int(os.environ.get("GPIO_PIN", "17"))
PRINTER_HOST: str = os.environ.get("PRINTER_HOST", "192.168.1.100")
PRINTER_PORT: int = int(os.environ.get("PRINTER_PORT", "9100"))
