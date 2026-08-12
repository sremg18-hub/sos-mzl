import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '$lib/server/db';
import { sessions, users, type User } from '$lib/server/db/schema';
import { eq, gt } from 'drizzle-orm';
import { SESSION_COOKIE, SESSION_DURATION_MS } from '$lib/constants';

export function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
	const token = randomBytes(32).toString('base64url');
	await db.insert(sessions).values({
		id: token,
		userId,
		expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
	});
	return token;
}

export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, token));
}

export async function getUserFromToken(token: string | undefined): Promise<User | null> {
	if (!token) return null;
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, token)
	});
	if (!session || session.expiresAt.getTime() < Date.now()) return null;
	const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
	if (!user || !user.active) return null;
	return user;
}

export async function cleanupExpiredSessions(): Promise<void> {
	await db.delete(sessions).where(gt(sessions.expiresAt, new Date(0)));
}

export function sessionCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		maxAge: Math.floor(SESSION_DURATION_MS / 1000)
	};
}
