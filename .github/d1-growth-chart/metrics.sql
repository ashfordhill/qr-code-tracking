/* Per calendar day with activity. date('now') is unioned so the current UTC day is always included when the job runs. Cumulative COUNT(*) from D1. */
WITH
label_d AS (
  SELECT date(created_at) AS day
  FROM labels
),
scan_d AS (
  SELECT date(scanned_at) AS day
  FROM scans
),
all_days AS (
  SELECT DISTINCT day
  FROM (
    SELECT day FROM label_d
    UNION ALL
    SELECT day FROM scan_d
    UNION ALL
    SELECT date('now') AS day
  )
)
SELECT
  strftime('%Y-%m-%d', a.day) AS calendar_day,
  (
    SELECT COUNT(*)
    FROM labels
    WHERE date(created_at) <= a.day
  ) AS labels_cumulative,
  (
    SELECT COUNT(*)
    FROM scans
    WHERE date(scanned_at) <= a.day
  ) AS scans_cumulative
FROM all_days AS a
ORDER BY a.day;
