CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  dest TEXT NOT NULL,
  lat REAL,
  lon REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT
);

CREATE TABLE IF NOT EXISTS qr_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  ua TEXT,
  ip_hash TEXT
);