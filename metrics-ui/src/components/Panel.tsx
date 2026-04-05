import { useEffect, useState } from 'react';
import { fetchScans } from '../api';
import type { Label, Scan } from '../types';

interface Props {
  label: Label | null;
}

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export default function Panel({ label }: Props) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);

  useEffect(() => {
    if (!label) return;
    setScans([]);
    setLoadingScans(true);
    fetchScans(label.id)
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoadingScans(false));
  }, [label?.id]);

  return (
    <div style={styles.panel}>
      {!label ? (
        <div style={styles.empty}>
          <span style={styles.emptyHint}>Click a dot on the map<br />to view its metrics.</span>
        </div>
      ) : (
        <>
          <div style={styles.header}>
            <div style={styles.headerLabel}>Selected Label</div>
            <div style={styles.slug}>{label.slug}</div>
          </div>
          <div style={styles.body}>
            <Metric label="Scan Count">
              <span style={{ ...styles.value, ...styles.big }}>{label.scanCount}</span>
            </Metric>
            <Metric label="Last Scanned">
              <span style={styles.value}>{fmt(label.lastScannedAt)}</span>
            </Metric>
            <Metric label="Date Installed">
              <span style={styles.value}>{fmt(label.createdAt)}</span>
            </Metric>
            <Metric label="Coordinates">
              <span style={{ ...styles.value, ...styles.mono }}>
                {label.latitude.toFixed(6)}, {label.longitude.toFixed(6)}
              </span>
            </Metric>
            <Metric label="Destination">
              <span style={{ ...styles.value, ...styles.mono, fontSize: '0.78rem', wordBreak: 'break-all' }}>
                {label.dest || '—'}
              </span>
            </Metric>
            <Metric label="Print Status">
              <span style={{ ...styles.value, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                {label.printStatus}
              </span>
            </Metric>

            <hr style={styles.divider} />

            <div style={styles.scanHeader}>
              Scan History ({loadingScans ? '…' : scans.length})
            </div>
            {loadingScans ? (
              <div style={styles.scanEmpty}>Loading…</div>
            ) : scans.length === 0 ? (
              <div style={styles.scanEmpty}>No scans recorded yet.</div>
            ) : (
              scans.map(s => (
                <div key={s.id} style={styles.scanItem}>{fmt(s.scanned_at)}</div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={styles.metricLabel}>{label}</div>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 320,
    flexShrink: 0,
    background: '#1e293b',
    borderLeft: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  emptyHint: {
    fontSize: '0.85rem',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  header: {
    padding: '1rem 1.25rem 0.75rem',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  headerLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '0.4rem',
  },
  slug: {
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: '"SF Mono", "Fira Code", monospace',
    color: '#818cf8',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.25rem',
  },
  metricLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#64748b',
    marginBottom: '0.2rem',
  },
  value: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  big: {
    fontSize: '2.2rem',
    color: '#4ade80',
  },
  mono: {
    fontFamily: '"SF Mono", "Fira Code", monospace',
    fontSize: '0.85rem',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #334155',
    margin: '1rem 0 0.75rem',
  },
  scanHeader: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#64748b',
    marginBottom: '0.5rem',
  },
  scanItem: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontFamily: '"SF Mono", "Fira Code", monospace',
    padding: '0.3rem 0',
    borderBottom: '1px solid #0f172a',
  },
  scanEmpty: {
    fontSize: '0.8rem',
    color: '#475569',
  },
};
