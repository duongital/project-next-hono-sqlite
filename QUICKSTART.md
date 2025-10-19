# Quick Start Guide

Get your monorepo up and running in minutes.

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Cloudflare D1 Database

Create your database:

```bash
pnpm db:create
```

This will output something like:

```
✅ Successfully created DB 'backend-db'

[[d1_databases]]
binding = "DB"
database_name = "backend-db"
database_id = "abc123-def456-ghi789"
```

### 3. Update Wrangler Configuration

Copy the output and update `apps/backend/wrangler.toml`:

```toml
# Uncomment and update these lines:
[[d1_databases]]
binding = "DB"
database_name = "backend-db"
database_id = "abc123-def456-ghi789"  # Your actual ID from step 2
```

### 4. Run Database Migrations

```bash
pnpm db:migrate:local
```

### 5. Start Development Servers

```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:8787

## Verify Everything Works

### Test Backend API

```bash
curl http://localhost:8787/api/health
# Should return: {"status":"ok","timestamp":"..."}

curl http://localhost:8787/api/items
# Should return: {"items":[...]}
```

### Test Frontend

Visit http://localhost:3000 in your browser.

## Next Steps

1. **Customize the frontend** - Edit `apps/frontend/src/app/page.tsx`
2. **Add API routes** - Add routes in `apps/backend/src/index.ts`
3. **Update database schema** - Modify `apps/backend/src/db/schema.sql`
4. **Add shared types** - Update `packages/shared-types/src/index.ts`

## Common Commands

```bash
# Development
pnpm dev              # Run both apps
pnpm dev:frontend     # Run only frontend
pnpm dev:backend      # Run only backend

# Build
pnpm build            # Build all apps
pnpm build:frontend   # Build only frontend

# Database
pnpm db:migrate:local # Migrate local database
pnpm db:migrate       # Migrate production database

# Deploy
pnpm deploy:backend   # Deploy backend to Cloudflare
```

## Troubleshooting

**Problem**: Backend returns 500 errors

**Solution**: Make sure you've:
1. Created the D1 database
2. Updated wrangler.toml with database credentials
3. Run migrations: `pnpm db:migrate:local`

---

**Problem**: Frontend can't connect to backend

**Solution**: Create `apps/frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

---

**Problem**: pnpm warnings about build scripts

**Solution**: Run `pnpm approve-builds` and approve the necessary scripts

## Project Structure Overview

```
project-next-hono-sqlite/
├── apps/
│   ├── frontend/         # Next.js app
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   └── lib/      # Utilities (API client)
│   │   └── vercel.json   # Vercel config
│   └── backend/          # Hono.js API
│       ├── src/
│       │   ├── index.ts  # Main API file
│       │   └── db/       # Database schema
│       └── wrangler.toml # Cloudflare config
├── packages/
│   └── shared-types/     # Shared TypeScript types
└── package.json          # Root package with scripts
```

## Ready to Deploy?

See [README.md](./README.md) for deployment instructions to Vercel and Cloudflare.
