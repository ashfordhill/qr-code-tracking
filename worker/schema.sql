CREATE TABLE IF NOT EXISTS labels (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  latitude        REAL NOT NULL,
  longitude       REAL NOT NULL,
  created_at      TEXT NOT NULL,
  source          TEXT,
  print_status    TEXT NOT NULL DEFAULT 'none',
  dest            TEXT,
  scan_count      INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_labels_print_status ON labels (print_status, created_at);

CREATE TABLE IF NOT EXISTS scans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label_id   TEXT NOT NULL REFERENCES labels(id),
  scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scans_label_id ON scans (label_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans (scanned_at);
