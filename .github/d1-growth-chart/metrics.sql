/*
  Poster + scan events for the growth chart.
  A poster can have several labels rows (QR replacements share poster_id), so
  counting raw labels rows overstates the poster count. Mirror the metrics
  site's definition (worker getAllPostersDeduped): one poster per
  COALESCE(poster_id, id), representative row prefers non-disabled then newest,
  and a poster is uninstalled when that row's uninstalled_at is set.
  Block comment on purpose: this file is passed as `wrangler --command "$SQL"`,
  and a leading `--` line would be parsed as a CLI flag.
*/
WITH ranked AS (
  SELECT
    l.*,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(l.poster_id, l.id)
      ORDER BY
        CASE WHEN l.disabled_at IS NULL THEN 0 ELSE 1 END,
        l.created_at DESC
    ) AS rn
  FROM labels l
),
posters AS (
  SELECT
    COALESCE(poster_id, id) AS poster_key,
    MIN(created_at) AS installed_at
  FROM labels
  WHERE created_at IS NOT NULL AND trim(created_at) != ''
  GROUP BY COALESCE(poster_id, id)
)
SELECT 'poster_installed' AS kind, installed_at AS at
FROM posters
UNION ALL
SELECT 'poster_uninstalled' AS kind, uninstalled_at AS at
FROM ranked
WHERE rn = 1 AND uninstalled_at IS NOT NULL AND trim(uninstalled_at) != ''
UNION ALL
SELECT 'scan' AS kind, scanned_at AS at
FROM scans
WHERE scanned_at IS NOT NULL AND trim(scanned_at) != ''
ORDER BY at;
