SELECT 'label' AS kind, created_at AS at
FROM labels
WHERE created_at IS NOT NULL AND trim(created_at) != ''
UNION ALL
SELECT 'scan' AS kind, scanned_at AS at
FROM scans
WHERE scanned_at IS NOT NULL AND trim(scanned_at) != ''
ORDER BY at;
