export function allowedOrigin(origin, configured = 'http://localhost:5173') {
  if (!origin) return true;
  if (origin === configured) return true;
  try {
    const expected = new URL(configured);
    const actual = new URL(origin);
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    return expected.protocol === 'http:' && actual.protocol === 'http:' &&
      expected.port === actual.port && loopback.has(expected.hostname) && loopback.has(actual.hostname);
  } catch { return false; }
}
