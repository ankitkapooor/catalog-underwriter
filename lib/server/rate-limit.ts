const requests = new Map<string, number[]>();

export function allowRequest(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (recent.length >= limit) return false;
  recent.push(now);
  requests.set(key, recent);
  return true;
}
