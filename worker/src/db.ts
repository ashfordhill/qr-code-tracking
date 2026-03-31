export interface LabelRow {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  created_at: string;
  source: string | null;
  metadata_json: string | null;
  print_status: string;
}

export interface Env {
  DB: D1Database;
  GPS_KV: KVNamespace;
  API_KEY: string;
  DOMAIN: string;
}

export async function insertLabel(
  db: D1Database,
  row: Omit<LabelRow, 'metadata_json'> & { metadata_json?: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO labels (id, slug, latitude, longitude, created_at, source, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.slug,
      row.latitude,
      row.longitude,
      row.created_at,
      row.source ?? null,
      row.metadata_json ?? null,
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
  row: Pick<LabelRow, 'id' | 'slug' | 'latitude' | 'longitude' | 'created_at' | 'source'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO labels (id, slug, latitude, longitude, created_at, source, print_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(row.id, row.slug, row.latitude, row.longitude, row.created_at, row.source ?? null)
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
