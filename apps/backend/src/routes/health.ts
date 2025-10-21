import { Hono } from 'hono';
import type { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

// Root health check route
app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono on Cloudflare Workers!' });
});

// Detailed health check route
app.get('/api/health', async (c) => {
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
