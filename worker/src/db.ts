export interface LabelRow {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  created_at: string;
  source: string | null;
  print_status: string;
  dest: string | null;
  scan_count: number;
  last_scanned_at: string | null;
}

export interface Env {
  DB: D1Database;
  GPS_KV: KVNamespace;
  API_KEY: string;
  DOMAIN: string;
  DEFAULT_DEST: string;
}

export async function insertLabel(
  db: D1Database,
  row: Omit<LabelRow, 'print_status' | 'scan_count' | 'last_scanned_at'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO labels (id, slug, latitude, longitude, created_at, source, dest)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.slug,
      row.latitude,
      row.longitude,
      row.created_at,
      row.source ?? null,
      row.dest ?? null,
    )
    .run();
}

export async function getLabelBySlug(
  db: D1Database,
  slug: string,
): Promise<LabelRow | null> {
  const result = await db
    .prepare(`SELECT * FROM labels WHERE slug = ?`)
    .bind(slug)
    .first<LabelRow>();
  return result ?? null;
}

export async function slugExists(db: D1Database, slug: string): Promise<boolean> {
  const result = await db
    .prepare(`SELECT 1 FROM labels WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first<{ 1: number }>();
  return result !== null;
}

export async function insertLabelPending(
  db: D1Database,
  row: Pick<LabelRow, 'id' | 'slug' | 'latitude' | 'longitude' | 'created_at' | 'source' | 'dest'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO labels (id, slug, latitude, longitude, created_at, source, dest, print_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(row.id, row.slug, row.latitude, row.longitude, row.created_at, row.source ?? null, row.dest ?? null)
    .run();
}

export async function claimNextPrintJob(
  db: D1Database,
): Promise<Pick<LabelRow, 'id' | 'slug' | 'latitude' | 'longitude'> | null> {
  const row = await db
    .prepare(
      `SELECT id, slug, latitude, longitude FROM labels
       WHERE print_status = 'pending' ORDER BY created_at ASC LIMIT 1`,
    )
    .first<Pick<LabelRow, 'id' | 'slug' | 'latitude' | 'longitude'>>();

  if (!row) return null;

  await db
    .prepare(`UPDATE labels SET print_status = 'printing' WHERE id = ?`)
    .bind(row.id)
    .run();

  return row;
}

export async function markPrintJobDone(db: D1Database, slug: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE labels SET print_status = 'printed' WHERE slug = ? AND print_status = 'printing'`,
    )
    .bind(slug)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function recordScan(db: D1Database, slug: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT id, dest FROM labels WHERE slug = ?`)
    .bind(slug)
    .first<{ id: string; dest: string | null }>();

  if (!row) return null;

  await db.batch([
    db
      .prepare(`UPDATE labels SET scan_count = scan_count + 1, last_scanned_at = datetime('now') WHERE id = ?`)
      .bind(row.id),
    db
      .prepare(`INSERT INTO scans (label_id) VALUES (?)`)
      .bind(row.id),
  ]);

  return row.dest;
}

export async function getAllLabels(db: D1Database): Promise<LabelRow[]> {
  const result = await db
    .prepare(`SELECT * FROM labels ORDER BY created_at DESC`)
    .all<LabelRow>();
  return result.results;
}

export async function getScanHistory(
  db: D1Database,
  labelId: string,
): Promise<{ id: number; scanned_at: string }[]> {
  const result = await db
    .prepare(`SELECT id, scanned_at FROM scans WHERE label_id = ? ORDER BY scanned_at DESC`)
    .bind(labelId)
    .all<{ id: number; scanned_at: string }>();
  return result.results;
}
