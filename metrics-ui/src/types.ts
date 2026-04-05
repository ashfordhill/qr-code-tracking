export interface Label {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  source: string | null;
  dest: string | null;
  printStatus: string;
  scanCount: number;
  lastScannedAt: string | null;
}

export interface Scan {
  id: number;
  scanned_at: string;
}
