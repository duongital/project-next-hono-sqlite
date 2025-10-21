import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { createDbClient } from '../db/client';
import { fruits } from '../db/schema';
import type { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

// Schemas
const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const CreateFruitSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  quantity: z.number().int().nonnegative().default(0),
});

const UpdateFruitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().positive().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

// List all fruits
app.get('/api/fruits', async (c) => {
  const db = createDbClient(c.env.DB);
  const allFruits = await db.select().from(fruits).all();

  return c.json({
    fruits: allFruits,
    total: allFruits.length,
  });
});

// Get single fruit by ID
app.get('/api/fruits/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  const fruit = await db.select().from(fruits).where(eq(fruits.id, id)).get();

  if (!fruit) {
    return c.json({ error: 'Fruit not found' }, 404);
  }

  return c.json(fruit);
});

// Create new fruit
app.post('/api/fruits', zValidator('json', CreateFruitSchema), async (c) => {
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  const result = await db.insert(fruits).values(data).returning();
  const newFruit = result[0];

  return c.json(
    {
      success: true,
      id: newFruit.id,
      fruit: newFruit,
    },
    201
  );
});

// Update fruit
app.put('/api/fruits/:id', zValidator('param', IdParamSchema), zValidator('json', UpdateFruitSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  // Check if fruit exists
  const existing = await db.select().from(fruits).where(eq(fruits.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Fruit not found' }, 404);
  }

  // Update the fruit
  const result = await db
    .update(fruits)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(fruits.id, id))
    .returning();

  return c.json(result[0]);
});

// Delete fruit
app.delete('/api/fruits/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  // Check if fruit exists
  const existing = await db.select().from(fruits).where(eq(fruits.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Fruit not found' }, 404);
  }

  await db.delete(fruits).where(eq(fruits.id, id));

  return c.json({
    success: true,
    message: 'Fruit deleted successfully',
  });
});

export default app;
