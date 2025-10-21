import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { createDbClient } from '../db/client';
import { todos } from '../db/schema';
import type { Bindings } from '../types/bindings';
import { jwtAuth } from '../middleware/auth';
import { createLogger } from '../middleware/logging';

const app = new Hono<{ Bindings: Bindings }>();

// Create a separate app for authenticated routes
const authenticatedApp = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>();
authenticatedApp.use('*', jwtAuth);

// Schemas
const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const CreateTodoSchema = z.object({
  task: z.string().min(1).max(500),
  isDone: z.boolean().default(false),
});

const UpdateTodoSchema = z.object({
  task: z.string().min(1).max(500).optional(),
  isDone: z.boolean().optional(),
});

// AUTHENTICATED ROUTES (will be registered first to take precedence)

// List user's todos (authenticated)
authenticatedApp.get('/my-todos', async (c) => {
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const userId = c.get('userId');

  logger.info('Fetching user todos', { userId });

  const userTodos = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .all();

  return c.json({
    todos: userTodos,
    total: userTodos.length,
  }, 200);
});

// Create user todo (authenticated)
authenticatedApp.post('/my-todos', zValidator('json', CreateTodoSchema), async (c) => {
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const userId = c.get('userId');

  logger.info('Creating todo for user', { userId, task: data.task });

  const result = await db
    .insert(todos)
    .values({
      ...data,
      userId,
    })
    .returning();

  const newTodo = result[0];

  return c.json(
    {
      success: true,
      id: newTodo.id,
      todo: newTodo,
    },
    201
  );
});

// Update user todo (authenticated)
authenticatedApp.put('/my-todos/:id', zValidator('param', IdParamSchema), zValidator('json', UpdateTodoSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const userId = c.get('userId');

  // Check if todo exists and belongs to user
  const existing = await db
    .select()
    .from(todos)
    .where(eq(todos.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  if (existing.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  logger.info('Updating user todo', { userId, todoId: id });

  // Update the todo
  const result = await db
    .update(todos)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(todos.id, id))
    .returning();

  return c.json(result[0], 200);
});

// Delete user todo (authenticated)
authenticatedApp.delete('/my-todos/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const userId = c.get('userId');

  // Check if todo exists and belongs to user
  const existing = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  if (existing.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  logger.info('Deleting user todo', { userId, todoId: id });

  await db.delete(todos).where(eq(todos.id, id));

  return c.json({
    success: true,
    message: 'Todo deleted successfully',
  }, 200);
});

// Register authenticated routes FIRST to ensure they take precedence
app.route('/api/todos', authenticatedApp);

// PUBLIC ROUTES (registered after authenticated routes)

// List all todos (legacy endpoint - kept for backward compatibility)
app.get('/api/todos', async (c) => {
  const db = createDbClient(c.env.DB);

  const allTodos = await db.select().from(todos).all();

  return c.json({
    todos: allTodos,
    total: allTodos.length,
  });
});

// Get single todo by ID
app.get('/api/todos/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  const todo = await db.select().from(todos).where(eq(todos.id, id)).get();

  if (!todo) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  return c.json(todo, 200);
});

// Create new todo (legacy endpoint)
app.post('/api/todos', zValidator('json', CreateTodoSchema), async (c) => {
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  const result = await db.insert(todos).values(data).returning();
  const newTodo = result[0];

  return c.json(
    {
      success: true,
      id: newTodo.id,
      todo: newTodo,
    },
    201
  );
});

// Update todo (legacy endpoint)
app.put('/api/todos/:id', zValidator('param', IdParamSchema), zValidator('json', UpdateTodoSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  // Check if todo exists
  const existing = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  // Update the todo
  const result = await db
    .update(todos)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(todos.id, id))
    .returning();

  return c.json(result[0], 200);
});

// Delete todo (legacy endpoint)
app.delete('/api/todos/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  // Check if todo exists
  const existing = await db.select().from(todos).where(eq(todos.id, id)).get();
  if (!existing) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  await db.delete(todos).where(eq(todos.id, id));

  return c.json({
    success: true,
    message: 'Todo deleted successfully',
  }, 200);
});

export default app;
