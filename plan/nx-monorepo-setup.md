# Nx Monorepo Setup with Next.js and Hono.js

**Created:** 2025-10-19
**Status:** Planning

## Overview

Initialize a monorepo project using Nx and pnpm with two applications:
- **Frontend**: Next.js application deployed to Vercel
- **Backend**: Hono.js API deployed to Cloudflare Workers with D1 database

## Technical Architecture

### Monorepo Structure
```
project-next-hono-sqlite/
├── apps/
│   ├── frontend/          # Next.js app
│   └── backend/           # Hono.js app
├── packages/              # Shared libraries
│   └── shared-types/      # Shared TypeScript types
├── nx.json
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Technology Stack
- **Monorepo Tool**: Nx
- **Package Manager**: pnpm
- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**:
  - Frontend → Vercel
  - Backend → Cloudflare Workers

## Implementation Steps

### Phase 1: Initialize Monorepo

1. **Setup Nx workspace with pnpm**
   ```bash
   npx create-nx-workspace@latest --pm pnpm --preset=apps
   ```
   - Choose workspace name
   - Select "None" for initial setup (we'll add apps manually)

2. **Configure pnpm workspace**
   - Create/verify `pnpm-workspace.yaml`
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **Install Nx plugins**
   ```bash
   pnpm add -D @nx/next @nx/js
   ```

### Phase 2: Setup Frontend (Next.js)

1. **Generate Next.js application**
   ```bash
   npx nx g @nx/next:app frontend
   ```
   - Configure with App Router
   - Enable TypeScript
   - Setup Tailwind CSS (optional)

2. **Configure for Vercel deployment**
   - Create `apps/frontend/vercel.json`
   - Setup environment variables
   - Configure build output directory

3. **Update Next.js configuration**
   - Modify `apps/frontend/next.config.js` for monorepo
   - Setup API routes if needed
   - Configure environment variables

### Phase 3: Setup Backend (Hono.js)

1. **Create backend application structure**
   ```bash
   mkdir -p apps/backend/src
   ```

2. **Install Hono.js dependencies**
   ```bash
   pnpm add hono --filter backend
   pnpm add -D wrangler @cloudflare/workers-types --filter backend
   ```

3. **Create Hono.js entry point**
   - File: `apps/backend/src/index.ts`
   - Setup basic Hono app with routes
   - Configure CORS for frontend

4. **Setup Cloudflare Workers configuration**
   - Create `apps/backend/wrangler.toml`
   ```toml
   name = "backend"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "your-database"
   database_id = "your-database-id"
   ```

5. **Configure build for Workers**
   - Update `apps/backend/project.json` with Nx targets
   - Setup esbuild or tsup for bundling
   - Configure TypeScript for Workers environment

### Phase 4: Setup Cloudflare D1 Database

1. **Create D1 database**
   ```bash
   cd apps/backend
   pnpm wrangler d1 create your-database
   ```

2. **Create database schema**
   - File: `apps/backend/schema.sql`
   - Define tables and indexes

3. **Run migrations**
   ```bash
   pnpm wrangler d1 execute your-database --file=./schema.sql
   ```

4. **Setup database client in Hono**
   - Create database service/repository layer
   - Type-safe database queries

### Phase 5: Shared Packages

1. **Create shared types package**
   ```bash
   npx nx g @nx/js:library shared-types --directory=packages/shared-types
   ```

2. **Define shared interfaces**
   - API request/response types
   - Database models
   - Common utilities

3. **Configure package references**
   - Update tsconfig paths in both apps
   - Setup proper import aliases

### Phase 6: Development Setup

1. **Configure development scripts in root package.json**
   ```json
   {
     "scripts": {
       "dev:frontend": "nx serve frontend",
       "dev:backend": "nx serve backend",
       "dev": "nx run-many -t serve",
       "build": "nx run-many -t build"
     }
   }
   ```

2. **Setup local development proxy**
   - Configure Next.js to proxy API calls to local Wrangler
   - Setup environment variables for local/production

3. **Configure Wrangler dev server**
   - Add dev script to backend
   - Setup local D1 database

### Phase 7: Deployment Configuration

1. **Vercel (Frontend)**
   - Create `vercel.json` if needed
   - Setup environment variables in Vercel dashboard
   - Configure build command: `nx build frontend`
   - Set output directory: `dist/apps/frontend`

2. **Cloudflare Workers (Backend)**
   - Update `wrangler.toml` with production settings
   - Setup secrets via Wrangler CLI
   - Configure deployment: `pnpm wrangler deploy`

3. **Environment Variables**
   - Frontend: `NEXT_PUBLIC_API_URL`
   - Backend: Database credentials, API keys
   - Setup .env.example files

## Files to Create

### Root Level
- `pnpm-workspace.yaml`
- `nx.json` (auto-generated, may need tweaks)
- `tsconfig.base.json` (auto-generated)
- `.gitignore`
- `README.md`

### Frontend App
- `apps/frontend/next.config.js`
- `apps/frontend/vercel.json`
- `apps/frontend/.env.local.example`
- `apps/frontend/src/app/page.tsx`
- `apps/frontend/src/lib/api-client.ts`

### Backend App
- `apps/backend/wrangler.toml`
- `apps/backend/src/index.ts`
- `apps/backend/src/routes/*.ts`
- `apps/backend/src/db/schema.sql`
- `apps/backend/src/db/client.ts`
- `apps/backend/.dev.vars.example`

### Shared Package
- `packages/shared-types/src/index.ts`
- `packages/shared-types/src/api/*.ts`
- `packages/shared-types/src/models/*.ts`

## Dependencies

### Root Dependencies
```json
{
  "devDependencies": {
    "@nx/next": "latest",
    "@nx/js": "latest",
    "nx": "latest",
    "typescript": "^5.3.0"
  }
}
```

### Frontend Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "esbuild": "^0.19.0"
  }
}
```

## Potential Challenges

### 1. Nx Configuration for Hono.js
**Challenge**: Nx doesn't have official Hono plugin
**Solution**:
- Use `@nx/js` plugin
- Create custom Nx executors/targets in `project.json`
- Leverage Wrangler CLI commands

### 2. TypeScript Path Mapping
**Challenge**: Different path resolution between Next.js, Workers, and Nx
**Solution**:
- Use consistent tsconfig.base.json paths
- Configure proper module resolution in each app
- Use Nx's built-in path mapping

### 3. CORS Configuration
**Challenge**: Cross-origin requests between Vercel and Cloudflare
**Solution**:
- Configure CORS middleware in Hono
- Whitelist Vercel domain in production
- Use proper environment variables

### 4. D1 Local Development
**Challenge**: D1 local development experience
**Solution**:
- Use Wrangler's local D1 support
- Create seed data scripts
- Document local setup process

### 5. Monorepo Build Optimization
**Challenge**: Nx caching with Cloudflare Workers
**Solution**:
- Configure proper Nx cache inputs/outputs
- Use Nx affected commands for CI/CD
- Setup remote caching if needed

## Testing Strategy

1. **Frontend**: Jest + React Testing Library
2. **Backend**: Hono test utilities + Vitest
3. **Integration**: E2E tests with Playwright
4. **Database**: Migration tests and seed data

## Next Steps After Setup

1. Implement basic CRUD API in backend
2. Create frontend pages consuming API
3. Setup CI/CD pipelines
4. Add authentication (e.g., Clerk, Auth0)
5. Implement error handling and logging
6. Setup monitoring (Sentry, Cloudflare Analytics)

## Resources

- [Nx Documentation](https://nx.dev)
- [Hono.js Documentation](https://hono.dev)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
