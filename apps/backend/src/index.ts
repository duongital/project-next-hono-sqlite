import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS configuration
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:4200'],
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono on Cloudflare Workers!' });
});

// API routes
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example endpoint using D1 database
app.get('/api/items', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM items ORDER BY created_at DESC'
    ).all();
    return c.json({ items: results });
  } catch (error) {
    return c.json({ error: 'Failed to fetch items' }, 500);
  }
});

app.post('/api/items', async (c) => {
  try {
    const { name, description } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO items (name, description) VALUES (?, ?)'
    ).bind(name, description || null).run();

    return c.json({
      success: true,
      id: result.meta.last_row_id
    }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create item' }, 500);
  }
});

app.delete('/api/items/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM items WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete item' }, 500);
  }
});

export default app;
