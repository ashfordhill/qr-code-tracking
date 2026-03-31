CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  dest TEXT NOT NULL,
  lat REAL,
  lon REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT,
  print_status TEXT NOT NULL DEFAULT 'none'
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_print_status ON qr_codes (print_status, created_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_location ON qr_codes (lat, lon);

CREATE TABLE IF NOT EXISTS qr_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  ua TEXT,
  ip_hash TEXT,
  FOREIGN KEY (qr_id) REFERENCES qr_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id ON qr_scans (qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans (scanned_at);
