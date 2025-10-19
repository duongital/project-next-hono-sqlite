# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx monorepo combining a Next.js 15 frontend (deployed to Vercel) with a Hono.js backend (deployed to Cloudflare Workers) using Cloudflare D1 (SQLite) database. The project uses pnpm as the package manager.

## Development Commands

### Running the Applications

```bash
# Both frontend and backend in parallel
pnpm dev

# Frontend only (http://localhost:3000)
pnpm dev:frontend

# Backend only (http://localhost:8787)
pnpm dev:backend
```

### Building

```bash
# All applications
pnpm build

# Frontend only
pnpm build:frontend
```

### Testing & Linting

```bash
# Run tests on all projects
pnpm test

# Run linters on all projects
pnpm lint
```

### Database Operations

```bash
# Create D1 database (outputs database_id for wrangler.toml)
pnpm db:create

# Run migrations on production database
pnpm db:migrate

# Run migrations on local database (for development)
pnpm db:migrate:local
```

### Deployment

```bash
# Deploy backend to Cloudflare Workers
pnpm deploy:backend
```

## Architecture

### Monorepo Structure

- **apps/frontend**: Next.js 15 application with App Router
- **apps/backend**: Hono.js API on Cloudflare Workers
- **packages/shared-types**: Shared TypeScript types between frontend and backend

### Key Architectural Patterns

**Backend (Hono.js on Cloudflare Workers)**
- Built with **OpenAPIHono** from `@hono/zod-openapi` for automatic API documentation
- Uses **Drizzle ORM** (`drizzle-orm/d1`) for type-safe database operations
- **Zod validation** integrated via `@hono/zod-openapi` for request/response validation
- Environment bindings are typed via the `Bindings` type (apps/backend/src/types/bindings.ts)
- D1 database accessed through `c.env.DB`, initialized with `createDbClient(c.env.DB)`
- CORS configured for localhost:3000 and localhost:4200
- Database binding name must be "DB" to match code expectations
- Routes organized in `apps/backend/src/routes/` directory
- Drizzle schema defined in `apps/backend/src/db/schema.ts`
- Swagger UI available at http://localhost:8787/docs
- OpenAPI spec available at http://localhost:8787/docs/openapi.json

**Frontend (Next.js)**
- Uses a typed API client class (`ApiClient`) for backend communication (apps/frontend/src/lib/api-client.ts)
- API URL configured via `NEXT_PUBLIC_API_URL` environment variable (defaults to http://localhost:8787)
- All API types imported from `@shared/types` package

**Shared Types Package**
- Located at `packages/shared-types`
- Imported as `@shared/types` in both frontend and backend
- Contains request/response types, database models, and utility types
- Changes here affect both applications

### Database Schema

The D1 database uses SQLite with two schema definitions:
- **SQL migrations** in `apps/backend/src/db/schema.sql` (source of truth for production)
- **Drizzle schema** in `apps/backend/src/db/schema.ts` (TypeScript definitions for type safety)

Current tables:
- `items` table - id, name, description, timestamps
- `fruits` table - id, name, price, quantity, timestamps

When modifying schema:
1. Update `apps/backend/src/db/schema.sql` (SQL migration)
2. Update `apps/backend/src/db/schema.ts` (Drizzle schema)
3. Run `pnpm db:migrate:local` for local dev or `pnpm db:migrate` for production
4. Update shared types in `packages/shared-types/src/index.ts` if needed

### Environment Configuration

**Frontend (.env.local)**
- `NEXT_PUBLIC_API_URL`: Backend API URL (required for production, defaults to localhost:8787)

**Backend (wrangler.toml)**
- Must configure D1 database binding after running `pnpm db:create`:
  ```toml
  [[d1_databases]]
  binding = "DB"
  database_name = "backend-db"
  database_id = "your-database-id-from-create-command"
  ```

**Backend (.dev.vars)** - git-ignored file for local secrets

## Nx-Specific Notes

- Backend targets (serve, deploy, db operations) are defined in `apps/backend/project.json`
- Frontend uses Nx Next.js plugin with auto-inferred targets
- The default base branch is `main` (configured in nx.json)
- Nx caching is enabled for build, lint, and test targets

## Common Workflows

### Adding a New API Endpoint

1. Create Zod schemas inline in your route file using `z` from `@hono/zod-openapi`
2. Define routes using `createRoute()` with OpenAPI metadata
3. Implement route handlers using `app.openapi(route, handler)`
4. Create route file in `apps/backend/src/routes/` and export the app
5. Register routes in `apps/backend/src/index.ts` using `app.route('/', yourRoutes)`
6. Define shared types in `packages/shared-types/src/index.ts`
7. Add corresponding methods to `ApiClient` class in `apps/frontend/src/lib/api-client.ts`

Example pattern (see `apps/backend/src/routes/fruits.ts` for reference)

### Database Schema Changes

1. Modify `apps/backend/src/db/schema.sql` (SQL migration)
2. Update `apps/backend/src/db/schema.ts` (Drizzle schema) to match
3. Run `pnpm db:migrate:local` to apply to local database
4. Update TypeScript types in `packages/shared-types/src/index.ts` if needed
5. Update route validators if the schema changes affect validation
6. For production, run `pnpm db:migrate` after deployment

### Testing Backend Locally

The backend runs on http://localhost:8787 with these endpoints:

**Documentation:**
- `GET /docs` - Swagger UI (interactive API documentation)
- `GET /docs/openapi.json` - OpenAPI specification

**Health:**
- `GET /` - Basic health check
- `GET /api/health` - Detailed health status (includes database connection)

**Items (legacy):**
- `GET /api/items` - List all items
- `POST /api/items` - Create a new item
- `DELETE /api/items/:id` - Delete an item

**Fruits (example CRUD with Drizzle + Zod):**
- `GET /api/fruits` - List all fruits
- `GET /api/fruits/:id` - Get single fruit
- `POST /api/fruits` - Create fruit (validated)
- `PUT /api/fruits/:id` - Update fruit (validated)
- `DELETE /api/fruits/:id` - Delete fruit

### Deployment Process

**Frontend**: Connect repository to Vercel with these settings:
- Build Command: `pnpm nx build frontend`
- Output Directory: `dist/apps/frontend/.next`
- Install Command: `pnpm install`
- Environment Variable: `NEXT_PUBLIC_API_URL` (set to Cloudflare Worker URL)

**Backend**: Run `pnpm deploy:backend` (requires Cloudflare Wrangler authentication)
