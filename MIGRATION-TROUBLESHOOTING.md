# Migration Troubleshooting: Table Already Exists

## The Problem

When running `pnpm db:migrate:local`, you get:

```
ERROR: table `fruits` already exists
```

This happens because:
1. The local database was already created using the old `schema.sql` file
2. Drizzle migrations are trying to create tables that already exist

## Solutions

### Solution 1: Fresh Start (Recommended for Development)

Reset your local database and apply all Drizzle migrations from scratch.

```bash
# 1. Delete the local database
rm -rf apps/backend/.wrangler/state/v3/d1/

# 2. Run migrations (this will recreate everything)
pnpm db:migrate:local
```

**When to use:**
- ✅ Development/local environment
- ✅ You don't have important data in local database
- ✅ Want a clean slate

### Solution 2: Mark Migrations as Already Applied

Tell Wrangler that the migrations have already been run (without actually running them).

```bash
cd apps/backend

# Check current migration status
pnpm wrangler d1 migrations list next-hono-sqlite --local

# Option A: If no migrations table exists, create it manually
# This is more complex - see "Manual Migration Tracking" below

# Option B: Just use Solution 1 (easier)
```

**When to use:**
- ✅ Production database with existing data
- ✅ You're transitioning from old system to Drizzle
- ❌ Not recommended for local dev (just reset)

### Solution 3: Create New Migration to Handle Existing Tables

Modify the generated migration to check if tables exist first.

**Not recommended** - This makes migrations messy. Better to use Solution 1 for local, and proper migration workflow going forward.

## Recommended Workflow

### For Your Current Situation (Local Dev)

```bash
# Navigate to project root
cd /Users/duongital/Programming/node/duongital/project-next-hono-sqlite

# Delete local database
rm -rf apps/backend/.wrangler/state/v3/d1/

# Run migrations
pnpm db:migrate:local

# Verify it worked
pnpm dev:backend
```

### For Future Schema Changes

```bash
# 1. Edit schema.ts
vim apps/backend/src/db/schema.ts

# 2. Generate new migration
pnpm db:generate

# 3. Apply to local
pnpm db:migrate:local

# 4. Test
pnpm dev:backend

# 5. Commit
git add apps/backend/drizzle/migrations/
git commit -m "feat: add new table"

# 6. Deploy & migrate production
pnpm deploy:backend
pnpm db:migrate:prod
```

## Verification

After applying migrations, verify they worked:

```bash
# Check migration status
cd apps/backend
pnpm wrangler d1 migrations list next-hono-sqlite --local

# Query the database
pnpm wrangler d1 execute next-hono-sqlite --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# Check fruits table
pnpm wrangler d1 execute next-hono-sqlite --local --command "SELECT * FROM fruits LIMIT 5"
```

## Understanding Migration State

Wrangler tracks migrations in a special table called `d1_migrations`:

```bash
# View migration history
pnpm wrangler d1 execute next-hono-sqlite --local --command "SELECT * FROM d1_migrations"
```

This table stores:
- `id` - Migration number
- `name` - Migration filename
- `applied_at` - When it was run

## Manual Migration Tracking (Advanced)

If you absolutely need to mark migrations as applied without running them:

```bash
cd apps/backend

# Insert migration records manually
pnpm wrangler d1 execute next-hono-sqlite --local --command "
CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO d1_migrations (id, name) VALUES
  (1, '0000_powerful_punisher.sql'),
  (2, '0001_solid_starjammers.sql');
"
```

**Warning:** Only use this if you're absolutely sure the database schema matches the migrations!

## Common Errors

### Error: "table already exists"

**Cause:** Database has tables that migration is trying to create
**Fix:** Use Solution 1 (reset local DB)

### Error: "no such table: d1_migrations"

**Cause:** No migrations have been run yet
**Fix:** Run `pnpm db:migrate:local` - Wrangler will create the table

### Error: "Migration X has already been applied"

**Cause:** Migration is already in d1_migrations table
**Fix:** This is normal - Wrangler skips already-applied migrations

## Quick Command Reference

```bash
# Reset local database
rm -rf apps/backend/.wrangler/state/v3/d1/

# Run migrations
pnpm db:migrate:local

# Check migration status
cd apps/backend
pnpm wrangler d1 migrations list next-hono-sqlite --local

# Query database
pnpm wrangler d1 execute next-hono-sqlite --local --command "SELECT * FROM fruits"

# Generate new migration
pnpm db:generate

# Open Drizzle Studio
pnpm db:studio
```

## Production Migrations

For production, **never** reset the database. Always use proper migrations:

```bash
# 1. Test locally first
pnpm db:migrate:local
pnpm dev:backend
# Test thoroughly

# 2. Backup production (important!)
cd apps/backend
pnpm wrangler d1 export next-hono-sqlite --remote --output=backup-$(date +%Y%m%d).sql

# 3. Apply to production
pnpm db:migrate:prod

# 4. Verify
pnpm wrangler d1 execute next-hono-sqlite --remote --command "SELECT * FROM d1_migrations"
```

## Best Practices

1. ✅ **Always reset local DB when transitioning to Drizzle**
2. ✅ **Test migrations locally before production**
3. ✅ **Backup production before migrations**
4. ✅ **Commit migration files to git**
5. ✅ **Never edit applied migrations**
6. ❌ **Don't reset production databases**
7. ❌ **Don't skip migration testing**

## Need Help?

If you're still having issues:

1. Check the error message in detail
2. Verify wrangler.toml has `migrations_dir = "drizzle/migrations"`
3. Ensure migrations directory exists and has .sql files
4. Check database exists: `pnpm wrangler d1 list`
5. Try resetting local DB (Solution 1)