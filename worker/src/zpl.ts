const LABEL_WIDTH_DOTS = 609;
const QR_SIZE = 8;

export function generateZpl(url: string): string {
  const xPos = Math.floor((LABEL_WIDTH_DOTS - QR_SIZE * 25) / 2);
  return `^XA\n^FO${xPos},50\n^BQN,2,${QR_SIZE}\n^FDQA,${url}^FS\n^XZ`;
}
