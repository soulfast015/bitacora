const attempts = new Map<string, { count: number; lastAttempt: number; blockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; blockedFor?: number } {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // If blocked, check if block expired
  if (record.blockedUntil > now) {
    const blockedFor = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, blockedFor };
  }

  // If window expired, reset
  if (now - record.lastAttempt > WINDOW_MS) {
    attempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record) {
    attempts.set(identifier, { count: 1, lastAttempt: now, blockedUntil: 0 });
    return;
  }

  // Reset if window expired
  if (now - record.lastAttempt > WINDOW_MS) {
    attempts.set(identifier, { count: 1, lastAttempt: now, blockedUntil: 0 });
    return;
  }

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
  }
}

export function resetAttempts(identifier: string): void {
  attempts.delete(identifier);
}
