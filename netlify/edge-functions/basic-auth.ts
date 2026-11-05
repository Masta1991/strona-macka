// Configure secrets in the hosting environment; missing configuration denies access.
export default async (request, context) => {
  const expectedUser = Netlify.env.get('PANEL_AUTH_USER');
  const expectedPass = Netlify.env.get('PANEL_AUTH_PASSWORD');
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
  if (!expectedUser || !expectedPass) return new Response('Dostęp nie jest skonfigurowany.', { status: 503, headers });
  let authorized = false;
  try {
    const header = request.headers.get('authorization') || '';
    if (header.startsWith('Basic ')) {
      const bytes = Uint8Array.from(atob(header.slice(6)), c => c.charCodeAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const separator = decoded.indexOf(':');
      authorized = separator >= 0 && decoded.slice(0, separator) === expectedUser && decoded.slice(separator + 1) === expectedPass;
    }
  } catch { authorized = false; }
  if (!authorized) return new Response('Unauthorized', { status: 401, headers: { ...headers, 'WWW-Authenticate': 'Basic realm="Gabinet", charset="UTF-8"' } });
  const response = await context.next();
  const result = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
  return result;
};
