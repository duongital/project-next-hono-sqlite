import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import type { Bindings } from '../types/bindings';

export type AuthContext = {
  userId: string;
};

export const clerkAuth = createMiddleware<{ Bindings: Bindings; Variables: AuthContext }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized - Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const clerkSecretKey = c.env.CLERK_SECRET_KEY;

      if (!clerkSecretKey) {
        console.error('CLERK_SECRET_KEY is not set in environment variables');
        return c.json({ error: 'Server configuration error' }, 500);
      }

      // Verify the Clerk JWT token
      const payload = await verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      // Extract userId from the token payload
      const userId = payload.sub;

      if (!userId) {
        return c.json({ error: 'Unauthorized - Invalid token payload' }, 401);
      }

      // Set userId in context for use in route handlers
      c.set('userId', userId);

      await next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
  }
);
