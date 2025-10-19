import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import type { Bindings } from './types/bindings';
import { requestLogger, errorLogger } from './middleware/logging';
import healthRoutes from './routes/health';
import fruitsRoutes from './routes/fruits';
import webhooksRoutes from './routes/webhooks';
import todosRoutes from './routes/todos';
import imagesRoutes from './routes/images';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Observability: Error logging middleware (must be first)
app.use('/*', errorLogger());

// Observability: Request/response logging
app.use('/*', requestLogger());

// CORS configuration
app.use('/*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin?.includes('localhost')) return origin;

    // Allow Vercel deployments
    if (origin?.endsWith('.vercel.app')) return origin;

    // Allow production domains (add your custom domains here)
    const allowedDomains = [
      'http://localhost:3000',
      'http://localhost:4200',
      // Add your production frontend URL here
      // 'https://your-domain.com',
    ];

    return allowedDomains.includes(origin || '') ? origin : allowedDomains[0];
  },
  credentials: true,
}));

// Register routes
app.route('/', healthRoutes);
app.route('/', fruitsRoutes);
app.route('/', webhooksRoutes);
app.route('/', todosRoutes);
app.route('/', imagesRoutes);

// OpenAPI documentation endpoint
app.doc('/docs/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Hono API',
    description: 'A CRUD API built with Hono, Drizzle ORM, and Cloudflare D1',
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Fruits', description: 'Fruits CRUD operations' },
    { name: 'Todos', description: 'Todos CRUD operations' },
    { name: 'Images', description: 'Image upload and management with R2' },
  ],
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));

export default app;
