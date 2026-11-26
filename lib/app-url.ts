/**
 * Resolve the public application base URL for shareable paste links.
 * Prefers APP_URL, then NEXT_PUBLIC_APP_URL, then Vercel's system URL.
 */
export function getAppUrl(): string {
  const explicit =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/\/$/, "");
    const protocol = host.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

export function buildPasteUrl(id: string): string {
  return `${getAppUrl()}/p/${id}`;
}
