# Deployment Guide - Cloudflare Workers & D1

This guide walks you through deploying your Hono.js backend to Cloudflare Workers with a D1 production database.

## Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI installed (already included in your project)
- Your code committed to git (recommended)

## Step-by-Step Deployment

### Step 1: Login to Cloudflare

Open your terminal and navigate to the backend directory:

```bash
cd apps/backend
```

Login to Cloudflare via Wrangler:

```bash
pnpm wrangler login
```

This will:
1. Open your browser
2. Ask you to authorize Wrangler
3. Save your credentials locally

**Verify login:**

```bash
pnpm wrangler whoami
```

You should see your Cloudflare account email and Account ID.

### Step 2: Create Production D1 Database

Create your production database:

```bash
pnpm wrangler d1 create backend-db
```

**Expected output:**

```
✅ Successfully created DB 'backend-db'

[[d1_databases]]
binding = "DB"
database_name = "backend-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Important:** Copy the entire `[[d1_databases]]` block including the `database_id`.

### Step 3: Update wrangler.toml

Open `apps/backend/wrangler.toml` and update the D1 configuration:

```toml
name = "backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Replace these values with your actual database credentials from Step 2
[[d1_databases]]
binding = "DB"
database_name = "backend-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Your actual ID

[dev]
port = 8787
```

**Save the file.**

### Step 4: Run Production Database Migrations

Apply your database schema to the production database:

```bash
pnpm wrangler d1 execute backend-db --file=./src/db/schema.sql
```

**Expected output:**

```
🌀 Executing on remote database backend-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🌀 To execute on your local development database, pass the --local flag to 'wrangler d1 execute'
🚣 Executed 3 commands in 0.5s
```

**Verify the migration:**

```bash
pnpm wrangler d1 execute backend-db --command "SELECT * FROM items"
```

You should see the sample data from your schema.

### Step 5: Deploy to Cloudflare Workers

Deploy your backend:

```bash
pnpm wrangler deploy
```

**Expected output:**

```
⛅️ wrangler 3.x.x
-------------------
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded backend (x.xx sec)
Published backend (x.xx sec)
  https://backend.your-subdomain.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Copy the Workers URL** (e.g., `https://backend.your-subdomain.workers.dev`)

### Step 6: Test Your Production API

Test the deployed endpoints:

```bash
# Health check
curl https://backend.your-subdomain.workers.dev/api/health

# Get items
curl https://backend.your-subdomain.workers.dev/api/items

# Create an item
curl -X POST https://backend.your-subdomain.workers.dev/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Item","description":"Created via API"}'
```

### Step 7: Update Frontend Configuration

Update your frontend to use the production API.

**For local development**, update `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://backend.your-subdomain.workers.dev
```

**For Vercel deployment**, add the environment variable in your Vercel dashboard:
- Go to your project settings
- Navigate to "Environment Variables"
- Add: `NEXT_PUBLIC_API_URL` = `https://backend.your-subdomain.workers.dev`

## Advanced Configuration

### Custom Domain (Optional)

To use a custom domain like `api.yourdomain.com`:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your `backend` worker
3. Click "Triggers" tab
4. Under "Custom Domains", click "Add Custom Domain"
5. Enter your domain (must be on Cloudflare DNS)
6. Update `NEXT_PUBLIC_API_URL` to use your custom domain

### Environment Variables / Secrets

To add secrets (API keys, tokens, etc.) to your Worker:

```bash
# Set a secret
pnpm wrangler secret put SECRET_NAME

# Example: Add an API key
pnpm wrangler secret put API_KEY
# You'll be prompted to enter the value
```

Access secrets in your code:

```typescript
// apps/backend/src/index.ts
type Bindings = {
  DB: D1Database;
  API_KEY: string;  // Add your secrets here
};

app.get('/protected', (c) => {
  const apiKey = c.env.API_KEY;
  // Use the secret
});
```

### CORS Configuration for Production

Update CORS in `apps/backend/src/index.ts` to allow your production frontend:

```typescript
app.use('/*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4200',
    'https://your-app.vercel.app',  // Add your Vercel domain
    'https://yourdomain.com'        // Add your custom domain if any
  ],
  credentials: true,
}));
```

**Redeploy after making changes:**

```bash
pnpm wrangler deploy
```

## Database Management

### View Database Tables

```bash
pnpm wrangler d1 execute backend-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Query Data

```bash
pnpm wrangler d1 execute backend-db --command "SELECT * FROM items LIMIT 10"
```

### Add New Migration

1. Update `apps/backend/src/db/schema.sql` with new changes
2. Run migration on production:

```bash
pnpm wrangler d1 execute backend-db --file=./src/db/schema.sql
```

### Backup Database (Export)

```bash
pnpm wrangler d1 export backend-db --output=backup.sql
```

### Restore from Backup

```bash
pnpm wrangler d1 execute backend-db --file=backup.sql
```

## Monitoring & Logs

### View Real-time Logs

```bash
pnpm wrangler tail
```

This will stream live logs from your Worker.

### View Logs in Dashboard

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your `backend` worker
4. Click "Logs" tab

## CI/CD Deployment

### GitHub Actions Example

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Cloudflare Workers

on:
  push:
    branches:
      - main
    paths:
      - 'apps/backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/backend'
```

**Setup GitHub Secrets:**

1. Get Cloudflare API Token:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create Token → Edit Cloudflare Workers template
   - Copy the token

2. Add to GitHub:
   - Go to your repo → Settings → Secrets and variables → Actions
   - New repository secret: `CLOUDFLARE_API_TOKEN`
   - Paste your token

## Troubleshooting

### Issue: "No D1 database found"

**Solution:** Make sure you've:
1. Created the database: `pnpm wrangler d1 create backend-db`
2. Updated `wrangler.toml` with the correct `database_id`

### Issue: "Unauthorized" or "Authentication error"

**Solution:**
```bash
pnpm wrangler logout
pnpm wrangler login
```

### Issue: CORS errors in production

**Solution:** Update CORS origins in `apps/backend/src/index.ts` to include your production frontend URL, then redeploy.

### Issue: "Module not found" errors

**Solution:** Make sure all dependencies are in `package.json` dependencies (not devDependencies):

```bash
cd apps/backend
pnpm add hono
pnpm wrangler deploy
```

### Issue: Database query errors

**Solution:** Verify migrations ran successfully:

```bash
pnpm wrangler d1 execute backend-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Quick Reference Commands

```bash
# From project root
cd apps/backend

# Login
pnpm wrangler login

# Create database
pnpm wrangler d1 create backend-db

# Run migrations
pnpm wrangler d1 execute backend-db --file=./src/db/schema.sql

# Deploy
pnpm wrangler deploy

# View logs
pnpm wrangler tail

# Execute SQL
pnpm wrangler d1 execute backend-db --command "SQL_QUERY"

# Backup
pnpm wrangler d1 export backend-db --output=backup.sql
```

## Cost & Limits

**Cloudflare Workers (Free Tier):**
- 100,000 requests/day
- 10ms CPU time per request
- More than enough for most projects

**D1 Database (Free Tier):**
- 5 GB storage
- 5 million rows read/day
- 100,000 rows written/day

**Upgrade:** If you exceed limits, Cloudflare will notify you. You can upgrade to paid plans as needed.

## Next Steps

After deployment:
1. ✅ Test all API endpoints
2. ✅ Update frontend to use production API
3. ✅ Deploy frontend to Vercel (see README.md)
4. ✅ Setup custom domain (optional)
5. ✅ Configure monitoring/alerts
6. ✅ Setup CI/CD pipeline (optional)

---

**Need help?**
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
- Hono.js Docs: https://hono.dev/
