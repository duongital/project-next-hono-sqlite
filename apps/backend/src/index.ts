import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types/bindings';
import { requestLogger, errorLogger } from './middleware/logging';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import fruitsRoutes from './routes/fruits';
import todosRoutes from './routes/todos';
import imagesRoutes from './routes/images';

const app = new Hono<{ Bindings: Bindings }>();

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
app.route('/', authRoutes);
app.route('/', healthRoutes);
app.route('/', fruitsRoutes);
app.route('/', todosRoutes);
app.route('/', imagesRoutes);

export default app;
