export interface LabelRow {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  created_at: string;
  source: string | null;
  metadata_json: string | null;
}

export interface Env {
  DB: D1Database;
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
