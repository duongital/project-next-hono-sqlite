# Drizzle Migration Setup - Complete ✅

**Date:** 2025-10-19
**Status:** Implemented

## What Was Done

Successfully set up Drizzle ORM for database migrations with support for multiple migration files.

## Changes Made

### 1. Installed Dependencies

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

### 2. Created Configuration Files

- **drizzle.config.ts** - Drizzle Kit configuration
- **src/db/schema.ts** - TypeScript schema definitions
- **src/db/client.ts** - Database client factory

### 3. Added Migration Commands

**Root package.json:**
```json
{
  "scripts": {
    "db:generate": "nx db:generate backend",
    "db:migrate:local": "nx db:migrate:local backend",
    "db:migrate:prod": "nx db:migrate:prod backend",
    "db:studio": "nx db:studio backend"
  }
}
```

**Backend package.json:**
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply next-hono-sqlite --local",
    "db:migrate:prod": "wrangler d1 migrations apply next-hono-sqlite --remote",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 4. Generated Initial Migration

Created first migration with existing schema:
- `apps/backend/drizzle/migrations/0000_powerful_punisher.sql`

## How to Use

### Workflow for Schema Changes

```bash
# 1. Edit TypeScript schema
vim apps/backend/src/db/schema.ts

# 2. Generate SQL migration file
pnpm db:generate

# 3. Apply to local database
pnpm db:migrate:local

# 4. Test changes
pnpm dev:backend

# 5. Apply to production (after deployment)
pnpm db:migrate:prod
```

## Key Differences: Old vs New

### Old Approach (Single SQL File)

```
apps/backend/src/db/schema.sql
```

**Limitations:**
- ❌ Single file for all schema
- ❌ No migration history
- ❌ Manual SQL writing
- ❌ No type safety
- ❌ Hard to track changes

### New Approach (Drizzle Migrations)

```
apps/backend/
├── drizzle/migrations/
│   ├── 0000_initial.sql
│   ├── 0001_add_table.sql
│   ├── 0002_add_column.sql
│   └── meta/
├── src/db/
│   ├── schema.ts       # TypeScript schema (source of truth)
│   └── client.ts       # DB client
└── drizzle.config.ts
```

**Benefits:**
- ✅ Multiple migration files
- ✅ Full migration history
- ✅ Auto-generated SQL
- ✅ Type-safe schema
- ✅ Easy to track changes in git

## Migration Files

Each schema change creates a new file:

```sql
-- drizzle/migrations/0001_add_fruits.sql
CREATE TABLE `fruits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `price` real NOT NULL,
  `quantity` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fruits_name` ON `fruits` (`name`);
```

## Examples

### Example 1: Add New Table

```typescript
// Edit schema.ts
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  name: text('name'),
});

// Generate & apply
pnpm db:generate
pnpm db:migrate:local
```

Creates: `drizzle/migrations/0001_add_users_table.sql`

### Example 2: Add Column

```typescript
// Edit existing table in schema.ts
export const fruits = sqliteTable('fruits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull(),
  category: text('category'), // NEW COLUMN
});

// Generate & apply
pnpm db:generate
pnpm db:migrate:local
```

Creates: `drizzle/migrations/0002_add_category_column.sql`

### Example 3: Add Index

```typescript
export const fruits = sqliteTable('fruits', {
  // columns...
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
  priceIdx: index('price_idx').on(table.price),
}));

// Generate & apply
pnpm db:generate
pnpm db:migrate:local
```

## Additional Tools

### Drizzle Studio

Visual database browser:

```bash
pnpm db:studio
```

Opens GUI at `https://local.drizzle.studio`

### Migration Status

Check which migrations are applied:

```bash
cd apps/backend
pnpm wrangler d1 migrations list next-hono-sqlite --local
```

## Documentation

Created comprehensive guide: **MIGRATIONS.md**

Covers:
- Complete workflow
- All commands
- Common scenarios
- Troubleshooting
- Best practices

## Files Modified

- ✅ `apps/backend/package.json` - Added migration scripts
- ✅ `apps/backend/project.json` - Added Nx targets
- ✅ `apps/backend/drizzle.config.ts` - Created
- ✅ `apps/backend/src/db/schema.ts` - Already exists
- ✅ `apps/backend/src/db/client.ts` - Already exists
- ✅ `package.json` - Added root migration scripts
- ✅ `MIGRATIONS.md` - Comprehensive documentation

## Status

✅ **Complete** - Drizzle ORM migrations fully set up and documented

## Next Steps

Users can now:
1. Make schema changes in TypeScript
2. Generate migrations automatically
3. Apply migrations to local/production
4. Track migration history in git
5. Use Drizzle Studio for visual database management
