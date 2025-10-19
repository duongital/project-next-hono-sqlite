# Backend Enhancement Plan: Drizzle ORM, Zod Validation & Swagger UI

**Date:** 2025-10-19
**Project:** Next.js + Hono + SQLite (Cloudflare D1)
**Scope:** Backend enhancement with modern tooling and CRUD API for fruits

---

## Overview

This plan outlines the implementation of:
1. **Drizzle ORM** - Type-safe database operations replacing raw SQL queries
2. **Zod Validator** - Runtime request/response validation with Hono integration
3. **Swagger UI** - Interactive API documentation
4. **Fruits CRUD API** - New resource with fields: name, price, quantity

### Goals
- Improve type safety across database layer
- Add runtime validation for all API endpoints
- Provide interactive API documentation for developers
- Implement a clean, scalable CRUD pattern that can be replicated for other resources

---

## Technical Approach

### Architecture Decisions

**Drizzle ORM Integration**
- Use `drizzle-orm/d1` adapter for Cloudflare D1 compatibility
- Define schema using Drizzle's TypeScript schema definition
- Keep existing SQL migrations, add Drizzle schema alongside
- Use `drizzle-kit` for schema introspection and migration generation

**Zod Validation Strategy**
- Use `@hono/zod-validator` middleware for request validation
- Define schemas in a centralized location (`src/validators/`)
- Export inferred TypeScript types from Zod schemas
- Validate request bodies, params, and query strings

**Swagger UI Implementation**
- Use `@hono/swagger-ui` for interactive documentation
- Use `@hono/zod-openapi` to generate OpenAPI spec from Zod schemas
- Serve Swagger UI at `/docs` endpoint
- Auto-generate API documentation from route definitions

**Project Structure**
```
apps/backend/src/
├── index.ts                 # Main app entry
├── db/
│   ├── schema.sql          # Raw SQL migrations (existing)
│   ├── schema.ts           # Drizzle schema definitions
│   └── client.ts           # Drizzle client initialization
├── validators/
│   ├── fruits.ts           # Zod schemas for fruits endpoints
│   └── common.ts           # Shared validation schemas
├── routes/
│   ├── fruits.ts           # Fruits CRUD routes
│   └── health.ts           # Health check routes
└── types/
    └── bindings.ts         # Cloudflare bindings types
```

---

## Implementation Steps

### Phase 1: Dependencies Installation

**Install Drizzle ORM**
```bash
pnpm add drizzle-orm --filter backend
pnpm add -D drizzle-kit --filter backend
```

**Install Zod & Hono Validators**
```bash
pnpm add zod @hono/zod-validator --filter backend
```

**Install Swagger/OpenAPI**
```bash
pnpm add @hono/swagger-ui @hono/zod-openapi --filter backend
```

### Phase 2: Database Schema Setup

**Create Drizzle Schema** (`apps/backend/src/db/schema.ts`)
- Define `fruits` table with Drizzle schema builder
- Include fields: id (auto-increment), name (text), price (real), quantity (integer), timestamps
- Define `items` table to match existing schema
- Export table definitions and inferred types

**Create Drizzle Client** (`apps/backend/src/db/client.ts`)
- Initialize Drizzle with D1 adapter
- Export typed database client
- Handle environment bindings properly

**Update SQL Migrations** (`apps/backend/src/db/schema.sql`)
- Add fruits table creation SQL
- Include indexes for performance
- Add sample data for development

**Create Drizzle Config** (`apps/backend/drizzle.config.ts`)
- Configure for D1 dialect
- Set schema file location
- Configure migrations output directory

### Phase 3: Validation Layer

**Common Validators** (`apps/backend/src/validators/common.ts`)
- ID parameter validation
- Pagination schemas
- Error response schemas

**Fruits Validators** (`apps/backend/src/validators/fruits.ts`)
- `CreateFruitSchema` - name (required, min 1 char), price (positive number), quantity (non-negative integer)
- `UpdateFruitSchema` - partial version of create schema
- `FruitParamsSchema` - ID validation for route params
- `FruitResponseSchema` - complete fruit object with timestamps
- Export inferred types for TypeScript usage

### Phase 4: API Routes Implementation

**Health Routes** (`apps/backend/src/routes/health.ts`)
- Migrate existing health check routes
- Add database connectivity check
- Use Zod validation for responses

**Fruits Routes** (`apps/backend/src/routes/fruits.ts`)
- `GET /api/fruits` - List all fruits (with optional pagination)
- `GET /api/fruits/:id` - Get single fruit by ID
- `POST /api/fruits` - Create new fruit (validated with Zod)
- `PUT /api/fruits/:id` - Update existing fruit (validated with Zod)
- `DELETE /api/fruits/:id` - Delete fruit
- Use Drizzle for all database operations
- Implement proper error handling and status codes

### Phase 5: OpenAPI/Swagger Setup

**Update Main App** (`apps/backend/src/index.ts`)
- Switch from regular Hono to `OpenAPIHono` from `@hono/zod-openapi`
- Register all routes with OpenAPI metadata
- Configure Swagger UI middleware at `/docs`
- Add OpenAPI JSON endpoint at `/docs/openapi.json`

**Route Documentation**
- Add OpenAPI route metadata to all endpoints
- Include descriptions, request/response schemas
- Tag routes by resource (fruits, health)
- Add examples for request/response bodies

### Phase 6: Type Safety Integration

**Update Bindings** (`apps/backend/src/types/bindings.ts`)
- Move `Bindings` type to dedicated file
- Add proper D1Database type imports
- Export for reuse across the application

**Update Shared Types Package** (`packages/shared-types/src/index.ts`)
- Add Fruit type (can infer from Zod schema or Drizzle table)
- Add CreateFruit, UpdateFruit DTOs
- Add API response types for fruits endpoints

**Frontend API Client** (`apps/frontend/src/lib/api-client.ts`)
- Add methods for fruits CRUD operations
- Use shared types from `@shared/types`

### Phase 7: Database Migration

**Create Migration SQL**
```sql
-- Migration: Add fruits table
CREATE TABLE IF NOT EXISTS fruits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fruits_created_at ON fruits(created_at);

-- Sample data
INSERT INTO fruits (name, price, quantity) VALUES
  ('Apple', 1.99, 100),
  ('Banana', 0.99, 150),
  ('Orange', 2.49, 80);
```

**Update Wrangler Config**
- Ensure D1 binding name matches code expectations
- Fix binding name from "next_hono_sqlite" to "DB" (as per CLAUDE.md)

**Run Migrations**
```bash
# Local development
pnpm db:migrate:local

# Production
pnpm db:migrate
```

### Phase 8: Testing & Documentation

**Manual Testing Checklist**
- [ ] Swagger UI loads at http://localhost:8787/docs
- [ ] OpenAPI spec available at http://localhost:8787/docs/openapi.json
- [ ] GET /api/fruits returns all fruits
- [ ] GET /api/fruits/:id returns single fruit
- [ ] POST /api/fruits creates fruit with validation
- [ ] POST /api/fruits rejects invalid data (negative price, missing name)
- [ ] PUT /api/fruits/:id updates fruit
- [ ] DELETE /api/fruits/:id removes fruit
- [ ] CORS works for frontend requests
- [ ] Type safety works in IDE (autocomplete, errors)

**Update Documentation**
- Update CLAUDE.md with new architecture patterns
- Document Drizzle schema location
- Document validator patterns
- Add Swagger UI URL to development workflow

---

## Files to Create

1. `apps/backend/src/db/schema.ts` - Drizzle schema definitions
2. `apps/backend/src/db/client.ts` - Drizzle client initialization
3. `apps/backend/src/validators/common.ts` - Shared validation schemas
4. `apps/backend/src/validators/fruits.ts` - Fruits validation schemas
5. `apps/backend/src/routes/health.ts` - Health check routes
6. `apps/backend/src/routes/fruits.ts` - Fruits CRUD routes
7. `apps/backend/src/types/bindings.ts` - Cloudflare bindings types
8. `apps/backend/drizzle.config.ts` - Drizzle configuration
9. `apps/backend/src/db/migrations/002_create_fruits_table.sql` - Fruits table migration

## Files to Modify

1. `apps/backend/src/index.ts` - Switch to OpenAPIHono, register routes
2. `apps/backend/src/db/schema.sql` - Add fruits table SQL
3. `apps/backend/package.json` - Add new dependencies
4. `apps/backend/wrangler.toml` - Fix D1 binding name to "DB"
5. `packages/shared-types/src/index.ts` - Add Fruit types
6. `apps/frontend/src/lib/api-client.ts` - Add fruits API methods
7. `CLAUDE.md` - Document new architecture patterns

---

## Dependencies

### NPM Packages
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "drizzle-orm": "^0.33.0",
    "zod": "^3.23.0",
    "@hono/zod-validator": "^0.4.0",
    "@hono/zod-openapi": "^0.16.0",
    "@hono/swagger-ui": "^0.4.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "drizzle-kit": "^0.24.0"
  }
}
```

### Cloudflare Resources
- D1 Database (already created)
- Workers deployment (already configured)

---

## Potential Challenges & Solutions

### Challenge 1: D1 Drizzle Compatibility
**Issue:** Drizzle's D1 adapter may have limitations compared to other databases
**Solution:**
- Use `drizzle-orm/d1` specifically designed for Cloudflare D1
- Test complex queries early to ensure compatibility
- Keep raw SQL option available for edge cases

### Challenge 2: OpenAPI Generation with D1 Bindings
**Issue:** Type conflicts between Hono context and OpenAPIHono
**Solution:**
- Use proper generic types: `OpenAPIHono<{ Bindings: Bindings }>`
- Ensure all route handlers properly type the context parameter
- Use middleware composition carefully to maintain types

### Challenge 3: Schema Duplication
**Issue:** SQL migrations vs Drizzle schema might drift
**Solution:**
- Treat SQL migrations as source of truth for production
- Use `drizzle-kit introspect` to sync Drizzle schema from database
- Add validation step in CI to ensure schemas match

### Challenge 4: Validation Error Messages
**Issue:** Zod default errors might not be user-friendly
**Solution:**
- Customize error messages in Zod schemas using `.describe()` and custom refinements
- Create error formatter middleware to transform Zod errors
- Use OpenAPI descriptions to document validation rules

### Challenge 5: CORS with Swagger UI
**Issue:** Swagger UI might have CORS issues when testing
**Solution:**
- Ensure CORS middleware runs before OpenAPI routes
- Add Swagger UI host to CORS allowed origins if needed
- Consider allowing all origins in development mode only

---

## Success Criteria

- [ ] All dependencies installed successfully
- [ ] Drizzle schema compiles without errors
- [ ] Database migrations run successfully (local and production)
- [ ] All fruits CRUD endpoints work with validation
- [ ] Swagger UI accessible and interactive
- [ ] OpenAPI spec includes all endpoints with proper schemas
- [ ] Frontend can consume fruits API with full type safety
- [ ] No TypeScript errors across backend codebase
- [ ] Existing items endpoints still functional
- [ ] CORS configured for development and production

---

## Next Steps After Implementation

1. **Add More Resources** - Replicate fruits pattern for other entities
2. **Authentication** - Add JWT or API key validation using Zod
3. **Rate Limiting** - Add Hono rate limiting middleware
4. **Error Tracking** - Integrate Sentry or similar for production errors
5. **Testing** - Add unit tests for validators and integration tests for routes
6. **CI/CD** - Add schema validation to CI pipeline
7. **Monitoring** - Add logging and analytics to track API usage

---

## Estimated Timeline

- Phase 1 (Dependencies): 15 minutes
- Phase 2 (Database Schema): 30 minutes
- Phase 3 (Validation Layer): 30 minutes
- Phase 4 (API Routes): 45 minutes
- Phase 5 (Swagger Setup): 30 minutes
- Phase 6 (Type Safety): 30 minutes
- Phase 7 (Migration): 20 minutes
- Phase 8 (Testing): 40 minutes

**Total Estimated Time:** ~4 hours

---

## References

- [Drizzle ORM D1 Docs](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [Hono Zod Validator](https://hono.dev/docs/guides/validation#zod-validator-middleware)
- [Hono OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Zod Documentation](https://zod.dev/)
