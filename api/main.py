import os, sqlite3, secrets, hashlib
from contextlib import contextmanager
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional

DB_PATH = os.getenv("DB_PATH", "/data/app.db")
API_KEY = os.getenv("API_KEY", "")
BASE_URL = os.getenv("BASE_URL", "https://ashhill.dev")
DEFAULT_DEST = os.getenv("DEFAULT_DEST", "https://google.com")

app = FastAPI()

@contextmanager
def db():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  try:
    yield conn
  finally:
    conn.close()

def init_db():
  with db() as conn:
    with open("/app/init.sql", "r", encoding="utf-8") as f:
      conn.executescript(f.read())
    conn.commit()

@app.on_event("startup")
def startup():
  os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
  init_db()

class Coords(BaseModel):
  lat: float
  lon: float

class CreateQrReq(BaseModel):
  coords: Optional[Coords] = None
  dest: Optional[str] = None

@app.get("/health")
def health():
  return {"status": "ok"}

@app.put("/api/qr")
async def create_qr(req: Request, body: CreateQrReq):
  if API_KEY:
    key = req.headers.get("x-api-key")
    if key != API_KEY:
      raise HTTPException(status_code=401, detail="unauthorized")

  qr_id = secrets.token_urlsafe(10).replace("-", "").replace("_", "")[:14]
  dest = body.dest or DEFAULT_DEST
  lat = body.coords.lat if body.coords else None
  lon = body.coords.lon if body.coords else None

  with db() as conn:
    conn.execute(
      "INSERT INTO qr_codes (id, dest, lat, lon) VALUES (?, ?, ?, ?)",
      (qr_id, dest, lat, lon),
    )
    conn.commit()

  return {"id": qr_id, "redirectUrl": f"{BASE_URL}/q/{qr_id}"}

@app.get("/api/qr/{qr_id}/stats")
async def get_stats(qr_id: str, req: Request):
  if API_KEY:
    key = req.headers.get("x-api-key")
    if key != API_KEY:
      raise HTTPException(status_code=401, detail="unauthorized")

  with db() as conn:
    row = conn.execute(
      "SELECT id, dest, lat, lon, created_at, scan_count, last_scanned_at FROM qr_codes WHERE id = ?",
      (qr_id,)
    ).fetchone()
    if not row:
      raise HTTPException(status_code=404, detail="not found")
    
    return dict(row)

@app.get("/q/{qr_id}")
async def redirect(qr_id: str, req: Request):
  with db() as conn:
    row = conn.execute("SELECT dest FROM qr_codes WHERE id = ?", (qr_id,)).fetchone()
    if not row:
      raise HTTPException(status_code=404, detail="not found")

    conn.execute(
      "UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = ? WHERE id = ?",
      (datetime.utcnow().isoformat(), qr_id),
    )

    ip = req.headers.get("x-forwarded-for") or req.client.host or ""
    ip_hash = hashlib.sha256(ip.encode("utf-8")).hexdigest() if ip else None
    ua = req.headers.get("user-agent", "")

    conn.execute(
      "INSERT INTO qr_scans (qr_id, ua, ip_hash) VALUES (?, ?, ?)",
      (qr_id, ua, ip_hash),
    )

    conn.commit()

  return RedirectResponse(url=row["dest"], status_code=302)