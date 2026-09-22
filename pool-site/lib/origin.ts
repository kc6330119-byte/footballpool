/** Trusted public URL: never derive the allowlist from forwarded request headers. */
export function publicOrigin() {
  return new URL(process.env.SITE_URL || 'https://cpfootballpool.netlify.app').origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  if (process.env.NODE_ENV !== 'production') return origin === new URL(request.url).origin;
  // Netlify's adapter can expose an internal URL to Next.js route handlers.
  return origin === publicOrigin();
}
