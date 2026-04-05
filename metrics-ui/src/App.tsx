import { useEffect, useState } from 'react';
import { fetchLabels } from './api';
import type { Label } from './types';
import MapView from './components/MapView';
import Panel from './components/Panel';

export default function App() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selected, setSelected] = useState<Label | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLabels()
      .then(setLabels)
      .catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={styles.header}>
        <h1 style={styles.h1}>QR Label Map</h1>
        <span style={styles.count}>
          {error ? '⚠ Failed to load' : `${labels.length} label${labels.length !== 1 ? 's' : ''}`}
        </span>
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <MapView
          labels={labels}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        <Panel label={selected} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
    zIndex: 10,
  },
  h1: {
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#f1f5f9',
  },
  count: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
};
