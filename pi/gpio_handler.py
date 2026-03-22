import asyncio
import logging

import config
from print_flow import run_print_flow

logger = logging.getLogger(__name__)

try:
    import RPi.GPIO as GPIO
    _GPIO_AVAILABLE = True
except ImportError:
    GPIO = None
    _GPIO_AVAILABLE = False
    logger.warning("GPIO_UNAVAILABLE RPi.GPIO not found; GPIO button handler disabled")


def _on_button_press(channel: int) -> None:
    logger.info("GPIO_BUTTON_PRESSED", extra={"pin": channel})
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    loop.run_until_complete(run_print_flow())


def setup_gpio() -> None:
    if not _GPIO_AVAILABLE:
        logger.warning("GPIO_SETUP_SKIPPED RPi.GPIO unavailable")
        return

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(config.GPIO_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.add_event_detect(
        config.GPIO_PIN,
        GPIO.FALLING,
        callback=_on_button_press,
        bouncetime=300,
    )
    logger.info("GPIO_SETUP_DONE", extra={"pin": config.GPIO_PIN, "bouncetime_ms": 300})


def cleanup_gpio() -> None:
    if _GPIO_AVAILABLE:
        GPIO.cleanup()
        logger.info("GPIO_CLEANUP_DONE")
