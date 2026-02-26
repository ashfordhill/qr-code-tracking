CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  dest TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_location ON qr_codes USING GIST(location);

CREATE TABLE IF NOT EXISTS qr_scans (
  id SERIAL PRIMARY KEY,
  qr_id TEXT NOT NULL,
  scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ua TEXT,
  ip_hash TEXT,
  FOREIGN KEY (qr_id) REFERENCES qr_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id ON qr_scans(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);