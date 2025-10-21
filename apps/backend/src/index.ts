import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import type { Bindings } from './types/bindings';
import { requestLogger, errorLogger } from './middleware/logging';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import fruitsRoutes from './routes/fruits';
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

// Custom OpenAPI endpoint with security schemes (must be registered BEFORE routes to avoid auth middleware)
app.get('/docs/openapi.json', (c) => {
  // Get the base OpenAPI spec
  const spec = app.getOpenAPIDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Hono API',
      description: 'A CRUD API built with Hono, Drizzle ORM, and Cloudflare D1',
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Fruits', description: 'Fruits CRUD operations' },
      { name: 'Todos', description: 'Todos CRUD operations' },
      { name: 'Images', description: 'Image upload and management with R2' },
    ],
    servers: [
      {
        url: 'http://localhost:8787',
        description: 'Local development server',
      },
    ],
  });

  // Inject security schemes
  if (!spec.components) {
    spec.components = {};
  }
  spec.components.securitySchemes = {
    Bearer: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your JWT token from the /api/auth/login or /api/auth/register endpoint',
    },
  };

  return c.json(spec);
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));

// Register routes (after docs to prevent auth middleware from blocking documentation)
app.route('/', authRoutes);
app.route('/', healthRoutes);
app.route('/', fruitsRoutes);
app.route('/', todosRoutes);
app.route('/', imagesRoutes);

export default app;
