# Cloudflare R2 Setup Guide

This guide explains how to configure Cloudflare R2 for image storage in your application.

## Prerequisites

- Cloudflare account with R2 enabled
- Wrangler CLI installed and authenticated (`wrangler login`)
- Backend already deployed or ready to deploy to Cloudflare Workers

## Step 1: Create R2 Bucket

### Option A: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the left sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `my-app-images`)
5. Choose a location (optional)
6. Click **Create bucket**

### Option B: Using Wrangler CLI

```bash
# Create R2 bucket
wrangler r2 bucket create my-app-images
```

## Step 2: Configure Public Access (Optional but Recommended)

To serve images directly from R2 without routing through your Worker:

1. In the Cloudflare Dashboard, go to your R2 bucket
2. Go to **Settings** tab
3. Under **Public access**, click **Allow Access**
4. Click **Add custom domain** or use the provided R2.dev subdomain
5. Note the public URL (e.g., `https://pub-xxxxx.r2.dev`)

**Note:** The public URL is required for the `R2_PUBLIC_URL` environment variable.

## Step 3: Update Backend Configuration

### 3.1: Update `wrangler.toml`

Add the R2 bucket binding to your `apps/backend/wrangler.toml`:

```toml
# ... existing configuration ...

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "my-app-images"
```

### 3.2: Add Environment Variables

Add the R2 public URL to your backend environment:

**For local development** - Create/update `apps/backend/.dev.vars`:

```
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**For production** - Set using Wrangler:

```bash
cd apps/backend
wrangler secret put R2_PUBLIC_URL
# When prompted, enter: https://pub-xxxxx.r2.dev
```

Or set via Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Go to Settings > Variables
4. Add environment variable `R2_PUBLIC_URL` with your public URL

## Step 4: Run Database Migration

The images table needs to be added to your database:

### Generate migration:

```bash
pnpm db:generate
```

This will create a migration file in `apps/backend/drizzle/migrations/` based on the schema changes.

### Apply migration locally:

```bash
pnpm db:migrate:local
```

### Apply migration to production:

```bash
pnpm db:migrate
```

## Step 5: Deploy Backend

Deploy your backend with the updated configuration:

```bash
pnpm deploy:backend
```

## Step 6: Test the Setup

1. Start your frontend: `pnpm dev:frontend`
2. Navigate to `/gallery`
3. Sign in with Clerk
4. Try uploading an image
5. Verify the image appears in the gallery
6. Check your R2 bucket in the Cloudflare Dashboard to see the uploaded file

## Configuration Summary

Your final configuration should include:

### `apps/backend/wrangler.toml`
```toml
[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "my-app-images"
```

### `apps/backend/.dev.vars` (local only, git-ignored)
```
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

### Production Environment Variables (via Wrangler or Dashboard)
- `R2_PUBLIC_URL`: Your R2 public URL
- `CLERK_SECRET_KEY`: Your Clerk secret key
- `CLERK_WEBHOOK_SECRET`: Your Clerk webhook secret

## CORS Configuration (If Needed)

If you encounter CORS issues when accessing images, configure CORS rules for your R2 bucket:

1. Go to your R2 bucket in Cloudflare Dashboard
2. Navigate to **Settings** > **CORS policy**
3. Add a CORS rule:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-frontend-domain.vercel.app"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Troubleshooting

### Images not displaying
- Verify `R2_PUBLIC_URL` is correctly set
- Check that the bucket has public access enabled
- Verify the image was uploaded successfully in R2 Dashboard

### Upload fails
- Check Wrangler logs: `wrangler tail`
- Verify the R2 bucket binding name matches `IMAGES_BUCKET`
- Ensure you have R2 write permissions

### Database errors
- Make sure migrations were applied: `pnpm db:migrate:local` or `pnpm db:migrate`
- Check that the images table exists in your D1 database

## Cost Considerations

R2 Pricing (as of 2024):
- **Storage**: $0.015 per GB per month
- **Class A operations** (writes): $4.50 per million requests
- **Class B operations** (reads): $0.36 per million requests
- **No egress fees** when accessed via R2.dev domain or custom domain

The free tier includes:
- 10 GB storage per month
- 1 million Class A operations per month
- 10 million Class B operations per month

## Security Best Practices

1. **Never commit** `.dev.vars` to git (it's in `.gitignore`)
2. Use Clerk authentication for all image operations
3. Validate file types and sizes on both frontend and backend
4. Consider implementing rate limiting for uploads
5. Regularly audit uploaded content
6. Consider adding malware scanning for uploaded files

## Next Steps

- Implement image optimization/resizing
- Add support for multiple file uploads
- Implement image tagging or albums
- Add image search functionality
- Consider using Cloudflare Images for automatic optimization
