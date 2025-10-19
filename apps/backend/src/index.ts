import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import type { Bindings } from './types/bindings';
import healthRoutes from './routes/health';
import fruitsRoutes from './routes/fruits';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// CORS configuration
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:4200'],
  credentials: true,
}));

// Register routes
app.route('/', healthRoutes);
app.route('/', fruitsRoutes);

// OpenAPI documentation endpoint
app.doc('/docs/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Hono Fruits API',
    description: 'A simple CRUD API for managing fruits built with Hono, Drizzle ORM, and Cloudflare D1',
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Fruits', description: 'Fruits CRUD operations' },
  ],
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));

export default app;
