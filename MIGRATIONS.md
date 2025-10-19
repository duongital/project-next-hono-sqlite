# Database Migrations with Drizzle ORM

This guide explains how to manage database migrations using Drizzle ORM with Cloudflare D1. Drizzle automatically generates SQL migration files from your TypeScript schema, allowing you to have multiple migration files that are tracked and applied in order.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Workflow](#workflow)
- [Available Commands](#available-commands)
- [Migration Files](#migration-files)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

## Overview

**Drizzle ORM** provides a type-safe way to define your database schema in TypeScript and automatically generates SQL migrations. This approach has several advantages:

- ✅ **Multiple migration files** - Each schema change creates a new migration file
- ✅ **Migration history** - Track all database changes over time
- ✅ **Type safety** - TypeScript types are inferred from your schema
- ✅ **Automatic SQL generation** - No need to write SQL manually
- ✅ **Rollback support** - Migrations are versioned and can be rolled back
- ✅ **Works with D1** - Fully compatible with Cloudflare D1

## Quick Start

### 1. Update Database Schema

Edit `apps/backend/src/db/schema.ts`:

```typescript
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const fruits = sqliteTable('fruits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull().default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

### 2. Generate Migration

```bash
pnpm db:generate
```

This creates a new migration file in `apps/backend/drizzle/migrations/` like:
- `0000_initial_schema.sql`
- `0001_add_fruits_table.sql`
- etc.

### 3. Apply Migration

**For local development:**

```bash
pnpm db:migrate:local
```

**For production:**

```bash
pnpm db:migrate:prod
```

## Workflow

### Standard Development Workflow

```bash
# 1. Make changes to schema.ts
# Edit apps/backend/src/db/schema.ts

# 2. Generate migration from schema changes
pnpm db:generate

# 3. Review the generated SQL file
# Check apps/backend/drizzle/migrations/XXXX_*.sql

# 4. Apply migration to local database
pnpm db:migrate:local

# 5. Test your changes
pnpm dev:backend

# 6. Commit migration files to git
git add apps/backend/drizzle/migrations/
git commit -m "feat: add new table"

# 7. Deploy and run migrations on production
pnpm deploy:backend
pnpm db:migrate:prod
```

## Available Commands

### From Project Root

```bash
# Generate new migration from schema changes
pnpm db:generate

# Apply migrations to local database
pnpm db:migrate:local

# Apply migrations to production database
pnpm db:migrate:prod

# Open Drizzle Studio (GUI for database)
pnpm db:studio

# Create new D1 database
pnpm db:create
```

### From apps/backend Directory

```bash
cd apps/backend

# Generate migration
pnpm db:generate

# Apply to local
pnpm db:migrate:local

# Apply to production
pnpm db:migrate:prod

# Open Drizzle Studio
pnpm db:studio
```

## Migration Files

### Directory Structure

```
apps/backend/drizzle/migrations/
├── 0000_initial_schema.sql
├── 0001_add_fruits_table.sql
├── 0002_add_user_email_index.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

### Migration File Format

Each migration file contains SQL statements:

```sql
-- 0001_add_fruits_table.sql
CREATE TABLE `fruits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `price` real NOT NULL,
  `quantity` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_fruits_name` ON `fruits` (`name`);
```

### Meta Files

The `meta/` directory contains:
- `_journal.json` - Migration history and order
- `XXXX_snapshot.json` - Schema snapshot at each migration

**Important:** Commit both SQL files and meta files to git!

## Common Scenarios

### Scenario 1: Adding a New Table

1. **Update schema:**

```typescript
// apps/backend/src/db/schema.ts
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

2. **Generate and apply:**

```bash
pnpm db:generate
pnpm db:migrate:local
```

### Scenario 2: Adding a Column to Existing Table

1. **Update schema:**

```typescript
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // NEW COLUMN
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

2. **Generate and apply:**

```bash
pnpm db:generate
pnpm db:migrate:local
```

Drizzle will generate SQL like:

```sql
ALTER TABLE `items` ADD COLUMN `category` text;
```

### Scenario 3: Adding an Index

1. **Update schema:**

```typescript
import { index } from 'drizzle-orm/sqlite-core';

export const fruits = sqliteTable('fruits', {
  // ... columns
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
}));
```

2. **Generate and apply:**

```bash
pnpm db:generate
pnpm db:migrate:local
```

### Scenario 4: Multiple Schema Changes

You can make multiple changes at once:

```typescript
// Add new table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// Add column to existing table
export const fruits = sqliteTable('fruits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id'), // NEW
  price: real('price').notNull(),
  // ... other columns
});
```

Drizzle will create ONE migration file with all changes.

### Scenario 5: Production Deployment

```bash
# 1. Test locally first
pnpm db:generate
pnpm db:migrate:local
pnpm dev:backend
# Test your changes

# 2. Commit migrations
git add apps/backend/drizzle/migrations/
git commit -m "feat: add categories"
git push

# 3. Deploy backend
pnpm deploy:backend

# 4. Run migrations on production
pnpm db:migrate:prod
```

## Drizzle Studio

Drizzle Studio is a GUI for viewing and editing your database.

```bash
pnpm db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can:
- Browse tables and data
- Run queries
- Edit records
- View schema

**Note:** Studio works with your **local** database only.

## Advanced Usage

### Manual SQL Migrations

If you need to write custom SQL (for complex migrations):

1. Generate the base migration:

```bash
pnpm db:generate
```

2. Edit the generated SQL file in `apps/backend/drizzle/migrations/XXXX_*.sql`

3. Add your custom SQL:

```sql
-- Auto-generated by Drizzle
CREATE TABLE `new_table` (...);

-- Your custom SQL
INSERT INTO new_table (name) SELECT name FROM old_table;
DROP TABLE old_table;
```

4. Apply the migration:

```bash
pnpm db:migrate:local
```

### Seeding Data

Create a seed script in `apps/backend/src/db/seed.ts`:

```typescript
import { createDbClient } from './client';
import { fruits } from './schema';

export async function seed(db: ReturnType<typeof createDbClient>) {
  await db.insert(fruits).values([
    { name: 'Apple', price: 1.99, quantity: 100 },
    { name: 'Banana', price: 0.99, quantity: 150 },
    { name: 'Orange', price: 2.49, quantity: 80 },
  ]);
}
```

Run via Wrangler:

```bash
# For local
wrangler d1 execute next-hono-sqlite --local --command "DELETE FROM fruits"
# Then seed via your app or custom script
```

## Comparison: Old Way vs Drizzle Way

### Old Way (Single SQL File)

```bash
# Edit schema.sql manually
vim apps/backend/src/db/schema.sql

# Run entire file every time
pnpm wrangler d1 execute next-hono-sqlite --file=./src/db/schema.sql
```

**Problems:**
- ❌ No migration history
- ❌ Can't track what changed
- ❌ Hard to rollback
- ❌ Risks data loss (DROP TABLE statements)
- ❌ No type safety

### Drizzle Way (Multiple Migration Files)

```bash
# Edit TypeScript schema
vim apps/backend/src/db/schema.ts

# Generate migration
pnpm db:generate

# Apply only new migrations
pnpm db:migrate:local
```

**Benefits:**
- ✅ Full migration history
- ✅ Type-safe schema
- ✅ Incremental migrations
- ✅ Easy rollback
- ✅ Git-friendly

## Troubleshooting

### Issue: "No config path provided"

**Solution:** Make sure you're running commands from the project root or `apps/backend` directory.

```bash
# From root
pnpm db:generate

# Or from backend
cd apps/backend
pnpm db:generate
```

### Issue: Migration already applied

**Solution:** Drizzle tracks which migrations have been applied. If you see this error, your database is already up to date.

```bash
# Check migration status
cd apps/backend
pnpm wrangler d1 migrations list next-hono-sqlite --local
```

### Issue: Schema drift (schema doesn't match database)

**Solution:**

1. Check which migrations have been applied:

```bash
pnpm wrangler d1 migrations list next-hono-sqlite --local
```

2. If needed, reset local database:

```bash
# Delete local database
rm -rf apps/backend/.wrangler/state/v3/d1/

# Re-run all migrations
pnpm db:migrate:local
```

### Issue: Can't connect to Drizzle Studio

**Solution:** Make sure you're running the command from `apps/backend`:

```bash
cd apps/backend
pnpm db:studio
```

### Issue: Production migrations fail

**Solution:**

1. Verify database exists and is configured:

```bash
cd apps/backend
pnpm wrangler d1 list
```

2. Check `wrangler.toml` has correct database_id

3. Ensure you're logged in:

```bash
pnpm wrangler whoami
```

## Migration Best Practices

1. **Always generate migrations** - Don't write SQL manually unless necessary
2. **Review generated SQL** - Check the migration file before applying
3. **Test locally first** - Always run `db:migrate:local` before production
4. **Commit migration files** - Include them in version control
5. **One migration per feature** - Don't mix unrelated schema changes
6. **Never edit applied migrations** - Create a new migration instead
7. **Backup production before major migrations** - Use `wrangler d1 export`

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Quick Reference

```bash
# Schema workflow
1. Edit: apps/backend/src/db/schema.ts
2. Generate: pnpm db:generate
3. Review: apps/backend/drizzle/migrations/XXXX_*.sql
4. Apply Local: pnpm db:migrate:local
5. Test: pnpm dev:backend
6. Apply Prod: pnpm db:migrate:prod

# Useful commands
pnpm db:generate          # Generate migration
pnpm db:migrate:local     # Apply to local
pnpm db:migrate:prod      # Apply to production
pnpm db:studio            # Open GUI
pnpm db:create            # Create new database
```