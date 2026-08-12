interface Attempt {
	count: number;
	resetAt: number;
}

const attempts = new Map<string, Attempt>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
	const now = Date.now();
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= now) {
		attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
		return { allowed: true, retryAfterSeconds: 0 };
	}
	if (entry.count >= MAX_ATTEMPTS) {
		return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
	}
	return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailure(key: string): void {
	const now = Date.now();
	const entry = attempts.get(key);
	if (!entry || entry.resetAt <= now) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return;
	}
	entry.count++;
}

export function clearFailures(key: string): void {
	attempts.delete(key);
}

setInterval(() => {
	const now = Date.now();
	for (const [k, v] of attempts) {
		if (v.resetAt <= now) attempts.delete(k);
	}
}, WINDOW_MS).unref?.();
