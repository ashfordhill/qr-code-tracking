import os
import time
import socket
import requests

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
API_KEY = os.getenv("API_KEY", "")
PRINTER_HOST = os.getenv("PRINTER_HOST", "")
PRINTER_PORT = int(os.getenv("PRINTER_PORT", "9100"))
PRINTER_DEVICE = os.getenv("PRINTER_DEVICE", "")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "3"))

HEADERS = {"x-api-key": API_KEY} if API_KEY else {}


def send_zpl_network(zpl: str):
    with socket.create_connection((PRINTER_HOST, PRINTER_PORT), timeout=10) as s:
        s.sendall(zpl.encode("utf-8"))


def send_zpl_device(zpl: str):
    with open(PRINTER_DEVICE, "wb") as f:
        f.write(zpl.encode("utf-8"))


def send_zpl(zpl: str):
    if PRINTER_HOST:
        send_zpl_network(zpl)
    elif PRINTER_DEVICE:
        send_zpl_device(zpl)
    else:
        raise RuntimeError("No printer configured. Set PRINTER_HOST or PRINTER_DEVICE.")


def poll():
    url = f"{SERVER_URL}/api/print-jobs/next"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json().get("job")


def mark_done(job_id: str):
    url = f"{SERVER_URL}/api/print-jobs/{job_id}/done"
    resp = requests.post(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()


def run():
    print(f"Pi client started. Polling {SERVER_URL} every {POLL_INTERVAL}s")
    if PRINTER_HOST:
        print(f"Printer: {PRINTER_HOST}:{PRINTER_PORT} (network)")
    elif PRINTER_DEVICE:
        print(f"Printer: {PRINTER_DEVICE} (device)")
    else:
        print("WARNING: No printer configured.")

    while True:
        try:
            job = poll()
            if job:
                print(f"Got job {job['id']} — lat={job['lat']}, lon={job['lon']}")
                send_zpl(job["zpl"])
                mark_done(job["id"])
                print(f"Job {job['id']} printed and marked done.")
            else:
                time.sleep(POLL_INTERVAL)
        except requests.RequestException as e:
            print(f"HTTP error: {e}")
            time.sleep(POLL_INTERVAL)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
