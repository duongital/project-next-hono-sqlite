import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { createDbClient } from '../db/client';
import { fruits } from '../db/schema';
import type { Bindings } from '../types/bindings';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Schemas
const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number).openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: '1',
  }),
});

const FruitSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Apple' }),
  price: z.number().openapi({ example: 1.99 }),
  quantity: z.number().openapi({ example: 100 }),
  createdAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
  updatedAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
});

const CreateFruitSchema = z.object({
  name: z.string().min(1).max(100).openapi({ example: 'Apple' }),
  price: z.number().positive().openapi({ example: 1.99 }),
  quantity: z.number().int().nonnegative().default(0).openapi({ example: 100 }),
});

const UpdateFruitSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({ example: 'Apple' }),
  price: z.number().positive().optional().openapi({ example: 2.49 }),
  quantity: z.number().int().nonnegative().optional().openapi({ example: 150 }),
});

const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'Not found' }),
});

// List all fruits
const listRoute = createRoute({
  method: 'get',
  path: '/api/fruits',
  tags: ['Fruits'],
  responses: {
    200: {
      description: 'List of all fruits',
      content: {
        'application/json': {
          schema: z.object({
            fruits: z.array(FruitSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
});

app.openapi(listRoute, async (c) => {
  const db = createDbClient(c.env.DB);
  const allFruits = await db.select().from(fruits).all();

  return c.json({
    fruits: allFruits,
    total: allFruits.length,
  });
});

// Get single fruit by ID
const getRoute = createRoute({
  method: 'get',
  path: '/api/fruits/{id}',
  tags: ['Fruits'],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Fruit details',
      content: {
        'application/json': {
          schema: FruitSchema,
        },
      },
    },
    404: {
      description: 'Fruit not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(getRoute, async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  const fruit = await db.select().from(fruits).where(eq(fruits.id, id)).get();

  if (!fruit) {
    return c.json({ error: 'Fruit not found' }, 404);
  }

  return c.json(fruit);
});

// Create new fruit
const createFruitRoute = createRoute({
  method: 'post',
  path: '/api/fruits',
  tags: ['Fruits'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateFruitSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Fruit created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            id: z.number(),
            fruit: FruitSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(createFruitRoute, async (c) => {
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
const updateRoute = createRoute({
  method: 'put',
  path: '/api/fruits/{id}',
  tags: ['Fruits'],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateFruitSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Fruit updated successfully',
      content: {
        'application/json': {
          schema: FruitSchema,
        },
      },
    },
    404: {
      description: 'Fruit not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(updateRoute, async (c) => {
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
const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/fruits/{id}',
  tags: ['Fruits'],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Fruit deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: 'Fruit not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteRoute, async (c) => {
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
