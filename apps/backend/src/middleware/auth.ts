import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { Bindings } from '../types/bindings';

export type AuthContext = {
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export const jwtAuth = createMiddleware<{ Bindings: Bindings; Variables: AuthContext }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized - Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const secret = new TextEncoder().encode(c.env.BETTER_AUTH_SECRET);

      // Verify JWT token using jose (Cloudflare Workers compatible)
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      const userId = payload.sub;
      if (!userId) {
        return c.json({ error: 'Unauthorized - Invalid token payload' }, 401);
      }

      // Set user context from JWT payload
      c.set('userId', userId);
      c.set('user', {
        id: userId,
        email: payload.email as string,
        name: payload.name as string | undefined,
      });

      await next();
    } catch (error) {
      console.error('JWT verification failed:', error);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
  }
);
