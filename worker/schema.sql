CREATE TABLE IF NOT EXISTS labels (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  created_at    TEXT NOT NULL,
  source        TEXT,
  metadata_json TEXT
);
