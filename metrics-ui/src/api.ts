import type { Label, Scan } from './types';

const BASE = import.meta.env.VITE_WORKER_BASE ?? 'https://ashhill.dev';

export async function fetchLabels(): Promise<Label[]> {
  const res = await fetch(`${BASE}/api/labels`);
  if (!res.ok) throw new Error(`Failed to fetch labels: ${res.status}`);
  const data = await res.json();
  return data.labels as Label[];
}

export async function fetchScans(labelId: string): Promise<Scan[]> {
  const res = await fetch(`${BASE}/api/labels/${labelId}/scans`);
  if (!res.ok) throw new Error(`Failed to fetch scans: ${res.status}`);
  const data = await res.json();
  return data.scans as Scan[];
}
