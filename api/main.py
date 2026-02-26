import os, secrets, hashlib, time
from contextlib import contextmanager
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import psycopg2.extras

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_USER = os.getenv("POSTGRES_USER", "qrtrack")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "qrtrack")
API_KEY = os.getenv("API_KEY", "")
BASE_URL = os.getenv("BASE_URL", "https://ashhill.dev")
DEFAULT_DEST = os.getenv("DEFAULT_DEST", "https://google.com")

app = FastAPI()

@contextmanager
def db():
  conn = psycopg2.connect(
    host=POSTGRES_HOST,
    port=POSTGRES_PORT,
    user=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    dbname=POSTGRES_DB
  )
  try:
    yield conn
  finally:
    conn.close()

def init_db():
  max_retries = 30
  for i in range(max_retries):
    try:
      with db() as conn:
        with conn.cursor() as cur:
          with open("/app/init.sql", "r", encoding="utf-8") as f:
            cur.execute(f.read())
        conn.commit()
      return
    except psycopg2.OperationalError:
      if i == max_retries - 1:
        raise
      time.sleep(1)

def generate_zpl(url: str, label_width_dots: int = 609, label_height_dots: int = 406) -> str:
  qr_size = 8
  x_pos = (label_width_dots - (qr_size * 25)) // 2
  y_pos = 50
  
  zpl = f"""^XA
^FO{x_pos},{y_pos}
^BQN,2,{qr_size}
^FDQA,{url}^FS
^XZ"""
  return zpl

@app.on_event("startup")
def startup():
  init_db()

class Coords(BaseModel):
  lat: float
  lon: float

class CreateQrReq(BaseModel):
  coords: Optional[Coords] = None
  dest: Optional[str] = None

class BoundsQuery(BaseModel):
  min_lat: float
  min_lon: float
  max_lat: float
  max_lon: float

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
  redirect_url = f"{BASE_URL}/q/{qr_id}"

  with db() as conn:
    with conn.cursor() as cur:
      if lat is not None and lon is not None:
        cur.execute(
          "INSERT INTO qr_codes (id, dest, lat, lon, location) VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)",
          (qr_id, dest, lat, lon, lon, lat),
        )
      else:
        cur.execute(
          "INSERT INTO qr_codes (id, dest, lat, lon) VALUES (%s, %s, %s, %s)",
          (qr_id, dest, lat, lon),
        )
    conn.commit()

  zpl = generate_zpl(redirect_url)
  
  return {
    "id": qr_id,
    "redirectUrl": redirect_url,
    "zpl": zpl
  }

@app.get("/api/qr/{qr_id}/stats")
async def get_stats(qr_id: str, req: Request):
  if API_KEY:
    key = req.headers.get("x-api-key")
    if key != API_KEY:
      raise HTTPException(status_code=401, detail="unauthorized")

  with db() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(
        "SELECT id, dest, lat, lon, created_at, scan_count, last_scanned_at FROM qr_codes WHERE id = %s",
        (qr_id,)
      )
      row = cur.fetchone()
      if not row:
        raise HTTPException(status_code=404, detail="not found")
      
      result = dict(row)
      if result.get("created_at"):
        result["created_at"] = result["created_at"].isoformat()
      if result.get("last_scanned_at"):
        result["last_scanned_at"] = result["last_scanned_at"].isoformat()
      
      return result

@app.post("/api/qr/bounds")
async def get_qr_codes_in_bounds(req: Request, bounds: BoundsQuery):
  if API_KEY:
    key = req.headers.get("x-api-key")
    if key != API_KEY:
      raise HTTPException(status_code=401, detail="unauthorized")

  with db() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute("""
        SELECT id, dest, lat, lon, created_at, scan_count, last_scanned_at
        FROM qr_codes
        WHERE location IS NOT NULL
          AND ST_Intersects(
            location,
            ST_MakeEnvelope(%s, %s, %s, %s, 4326)::geography
          )
      """, (bounds.min_lon, bounds.min_lat, bounds.max_lon, bounds.max_lat))
      
      rows = cur.fetchall()
      results = []
      for row in rows:
        result = dict(row)
        if result.get("created_at"):
          result["created_at"] = result["created_at"].isoformat()
        if result.get("last_scanned_at"):
          result["last_scanned_at"] = result["last_scanned_at"].isoformat()
        results.append(result)
      
      return {"codes": results, "count": len(results)}

@app.get("/q/{qr_id}")
async def redirect(qr_id: str, req: Request):
  with db() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute("SELECT dest FROM qr_codes WHERE id = %s", (qr_id,))
      row = cur.fetchone()
      if not row:
        raise HTTPException(status_code=404, detail="not found")

      cur.execute(
        "UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = %s WHERE id = %s",
        (datetime.utcnow(), qr_id),
      )

      ip = req.headers.get("x-forwarded-for") or req.client.host or ""
      ip_hash = hashlib.sha256(ip.encode("utf-8")).hexdigest() if ip else None
      ua = req.headers.get("user-agent", "")

      cur.execute(
        "INSERT INTO qr_scans (qr_id, ua, ip_hash) VALUES (%s, %s, %s)",
        (qr_id, ua, ip_hash),
      )

    conn.commit()

  return RedirectResponse(url=row["dest"], status_code=302)