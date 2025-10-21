import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { createDbClient } from '../db/client';
import { todos } from '../db/schema';
import type { Bindings } from '../types/bindings';
import { jwtAuth } from '../middleware/auth';
import { createLogger } from '../middleware/logging';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Create a separate app for authenticated routes
const authenticatedApp = new OpenAPIHono<{ Bindings: Bindings; Variables: { userId: string } }>();
authenticatedApp.use('*', jwtAuth);

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

const TodoSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  task: z.string().openapi({ example: 'Complete the project' }),
  isDone: z.boolean().openapi({ example: false }),
  createdAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
  updatedAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
});

const CreateTodoSchema = z.object({
  task: z.string().min(1).max(500).openapi({ example: 'Complete the project' }),
  isDone: z.boolean().default(false).openapi({ example: false }),
});

const UpdateTodoSchema = z.object({
  task: z.string().min(1).max(500).optional().openapi({ example: 'Update the project' }),
  isDone: z.boolean().optional().openapi({ example: true }),
});

const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'Not found' }),
});

// Define all routes first, then organize registration at the end
// This ensures proper route priority

// AUTHENTICATED ROUTES - Register these FIRST to main app to take precedence

// List user's todos (authenticated)
const listUserTodosRoute = createRoute({
  method: 'get',
  path: '/api/todos/my-todos',
  tags: ['Todos'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'List of user todos',
      content: {
        'application/json': {
          schema: z.object({
            todos: z.array(TodoSchema),
            total: z.number(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Register to authenticatedApp
authenticatedApp.openapi(listUserTodosRoute, async (c) => {
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

// List all todos (legacy endpoint - kept for backward compatibility)
const listRoute = createRoute({
  method: 'get',
  path: '/api/todos',
  tags: ['Todos'],
  responses: {
    200: {
      description: 'List of all todos',
      content: {
        'application/json': {
          schema: z.object({
            todos: z.array(TodoSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
});

app.openapi(listRoute, async (c) => {
  const db = createDbClient(c.env.DB);

  const allTodos = await db.select().from(todos).all();

  return c.json({
    todos: allTodos,
    total: allTodos.length,
  });
});

// Get single todo by ID
const getRoute = createRoute({
  method: 'get',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Todo details',
      content: {
        'application/json': {
          schema: TodoSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
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

  const todo = await db.select().from(todos).where(eq(todos.id, id)).get();

  if (!todo) {
    return c.json({ error: 'Todo not found' }, 404);
  }

  return c.json(todo, 200);
});

// Create user todo (authenticated)
const createUserTodoRoute = createRoute({
  method: 'post',
  path: '/api/todos/my-todos',
  tags: ['Todos'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTodoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Todo created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            id: z.number(),
            todo: TodoSchema,
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Register to authenticatedApp
authenticatedApp.openapi(createUserTodoRoute, async (c) => {
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

// Create new todo (legacy endpoint)
const createTodoRoute = createRoute({
  method: 'post',
  path: '/api/todos',
  tags: ['Todos'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTodoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Todo created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            id: z.number(),
            todo: TodoSchema,
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

app.openapi(createTodoRoute, async (c) => {
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

// Update user todo (authenticated)
const updateUserTodoRoute = createRoute({
  method: 'put',
  path: '/api/todos/my-todos/{id}',
  tags: ['Todos'],
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateTodoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Todo updated successfully',
      content: {
        'application/json': {
          schema: TodoSchema,
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - todo belongs to another user',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Register to authenticatedApp
authenticatedApp.openapi(updateUserTodoRoute, async (c) => {
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

// Update todo (legacy endpoint)
const updateRoute = createRoute({
  method: 'put',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateTodoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Todo updated successfully',
      content: {
        'application/json': {
          schema: TodoSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
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

// Delete user todo (authenticated)
const deleteUserTodoRoute = createRoute({
  method: 'delete',
  path: '/api/todos/my-todos/{id}',
  tags: ['Todos'],
  security: [{ Bearer: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Todo deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    403: {
      description: 'Forbidden - todo belongs to another user',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Register to authenticatedApp
authenticatedApp.openapi(deleteUserTodoRoute, async (c) => {
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

// Delete todo (legacy endpoint)
const deleteRoute = createRoute({
  method: 'delete',
  path: '/api/todos/{id}',
  tags: ['Todos'],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Todo deleted successfully',
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
      description: 'Todo not found',
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

// Merge authenticated routes into main app
app.route('/', authenticatedApp);

export default app;
