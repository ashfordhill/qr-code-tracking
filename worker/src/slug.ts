const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 9;

export function generateSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  let slug = '';
  for (const byte of bytes) {
    slug += CHARSET[byte % CHARSET.length];
  }
  return slug;
}

export async function generateUniqueSlug(
  checkExists: (slug: string) => Promise<boolean>,
  maxRetries = 10,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const slug = generateSlug();
    const exists = await checkExists(slug);
    if (!exists) return slug;
  }
  throw new Error('Failed to generate unique slug after max retries');
}
