import { Context, Next } from 'hono';
import { verifyJWT } from '../utils/auth';
import type { Bindings } from '../types/bindings';

export interface AuthContext {
  userId: string;
}

export async function jwtAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json({ error: 'Invalid authorization header format' }, 401);
    }

    const token = parts[1];

    // Verify JWT
    const { userId, error } = await verifyJWT(token, c.env.JWT_SECRET);

    if (!userId) {
      return c.json({ error: error || 'Invalid token' }, 401);
    }

    // Set userId in context
    c.set('userId', userId);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

// Middleware to get userId from context (for routes with optional auth)
export function getUserId(c: Context): string | undefined {
  try {
    return c.get('userId');
  } catch {
    return undefined;
  }
}
