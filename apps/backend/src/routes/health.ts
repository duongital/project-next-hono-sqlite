import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Bindings } from '../types/bindings';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Health check response schema
const HealthResponseSchema = z.object({
  status: z.string().openapi({ example: 'ok' }),
  timestamp: z.string().openapi({ example: '2025-10-19T12:00:00.000Z' }),
  database: z.string().optional().openapi({ example: 'connected' }),
});

// Root health check route
const rootRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Health'],
  responses: {
    200: {
      description: 'API is healthy',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(rootRoute, (c) => {
  return c.json({ message: 'Hello from Hono on Cloudflare Workers!' });
});

// Detailed health check route
const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['Health'],
  responses: {
    200: {
      description: 'Detailed health status',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

app.openapi(healthRoute, async (c) => {
  // Test database connection
  let dbStatus = 'unknown';
  try {
    await c.env.DB.prepare('SELECT 1').first();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default app;
