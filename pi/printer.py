import socket
import logging
from config import PRINTER_HOST, PRINTER_PORT

logger = logging.getLogger(__name__)


def send_to_printer(zpl: str) -> None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(10)
            sock.connect((PRINTER_HOST, PRINTER_PORT))
            sock.sendall(zpl.encode("utf-8"))
        logger.info("PRINTER_SEND_SUCCESS", extra={"host": PRINTER_HOST, "port": PRINTER_PORT})
    except OSError as exc:
        logger.error("PRINTER_SEND_FAILED", extra={"error": str(exc), "host": PRINTER_HOST, "port": PRINTER_PORT})
        raise
