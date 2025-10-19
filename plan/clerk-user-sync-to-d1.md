# Clerk User Sync to Cloudflare D1 Database

**Created:** 2025-10-19
**Status:** Planning
**Objective:** Automatically create a user record in Cloudflare D1 when a new user registers via Clerk

---

## Overview

When a user successfully registers through Clerk authentication, we need to create a corresponding user record in the Cloudflare D1 database. This ensures we can store additional user-specific data and maintain referential integrity for user-related features.

## Current Architecture

- **Frontend:** Next.js 15 with Clerk authentication (`@clerk/nextjs@6.33.7`)
- **Backend:** Hono.js on Cloudflare Workers with D1 database
- **Database:** Cloudflare D1 (SQLite) managed via Drizzle ORM
- **Deployment:** Frontend on Vercel, Backend on Cloudflare Workers

---

## Approach Options

### **Option 1: Clerk Webhooks → Cloudflare Worker (RECOMMENDED)**

**Architecture:**
```
User Signs Up → Clerk → Webhook → Hono Backend → D1 Database
```

**How It Works:**
1. User completes registration in Clerk
2. Clerk fires a `user.created` webhook event
3. Webhook endpoint in Hono backend receives the event
4. Backend validates webhook signature (using Clerk's Svix library)
5. Backend creates user record in D1 database
6. Returns success response to Clerk

**Pros:**
- ✅ Server-side, secure, and reliable
- ✅ Works across all registration methods (OAuth, email/password, magic links)
- ✅ Automatic retry mechanism built into Clerk webhooks
- ✅ No frontend code needed - completely decoupled
- ✅ Scales well for production
- ✅ Can handle other lifecycle events (user.updated, user.deleted)

**Cons:**
- ⚠️ Requires webhook endpoint setup in Clerk dashboard
- ⚠️ Need to handle webhook signature verification
- ⚠️ Slightly asynchronous (user created in D1 after Clerk, but usually <1s)

**Best For:** Production systems, all use cases

---

### **Option 2: Next.js Server Action (Post-Registration)**

**Architecture:**
```
User Signs Up → Clerk (Client) → Next.js Server Action → Hono Backend API → D1 Database
```

**How It Works:**
1. User completes registration in Clerk (client-side)
2. Frontend detects successful sign-up via Clerk hooks
3. Next.js server action calls Hono backend API with user data
4. Backend creates user record in D1 database

**Pros:**
- ✅ Immediate feedback to user
- ✅ Simpler initial setup (no webhook configuration)
- ✅ Can add custom UI loading states

**Cons:**
- ⚠️ User can close browser before sync completes
- ⚠️ Requires error handling in frontend
- ⚠️ Won't catch users created via Clerk dashboard or other methods
- ⚠️ Need to duplicate Clerk user data to backend securely

**Best For:** Simple prototypes, early development

---

### **Option 3: Clerk Middleware + API Route (Lazy Creation)**

**Architecture:**
```
User Signs Up → First API Request → Middleware checks D1 → Create if missing
```

**How It Works:**
1. User signs up via Clerk
2. On first authenticated API request, backend checks if user exists in D1
3. If not exists, create user record automatically
4. Continue with normal request

**Pros:**
- ✅ Simple implementation
- ✅ No webhook setup required
- ✅ User guaranteed to exist when needed

**Cons:**
- ⚠️ Adds latency to first request
- ⚠️ User might not be created until first API call
- ⚠️ Can't use user record for onboarding flows
- ⚠️ Race conditions if multiple requests happen simultaneously

**Best For:** Simple apps where user record isn't immediately needed

---

## Recommended Approach: Clerk Webhooks (Option 1)

### Technical Implementation Plan

#### **Step 1: Define Users Table Schema**

**File:** `apps/backend/src/db/schema.ts`

Add a users table with these fields:
- `id` (text, primary key) - Clerk user ID (e.g., `user_xxx`)
- `email` (text, unique, not null) - Primary email
- `firstName` (text, nullable)
- `lastName` (text, nullable)
- `imageUrl` (text, nullable) - Profile picture
- `createdAt` (text, timestamp)
- `updatedAt` (text, timestamp)

**Drizzle Schema:**
```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

---

#### **Step 2: Generate and Run Migration**

```bash
# Generate migration from schema
pnpm db:generate

# Apply to local database
pnpm db:migrate:local

# When ready for production
pnpm db:migrate
```

---

#### **Step 3: Install Svix for Webhook Verification**

Svix is Clerk's webhook signature verification library.

**File:** `apps/backend/package.json`

```bash
cd apps/backend
pnpm add svix
```

---

#### **Step 4: Create Webhook Route in Hono Backend**

**File:** `apps/backend/src/routes/webhooks.ts`

Create a new route to handle Clerk webhooks:
- Verify webhook signature using Svix
- Parse `user.created` event
- Insert user into D1 database
- Handle errors gracefully

**Endpoint:** `POST /api/webhooks/clerk`

**Key Logic:**
1. Get `svix-id`, `svix-timestamp`, `svix-signature` headers
2. Verify signature with Clerk webhook secret
3. Parse event type (`user.created`, `user.updated`, `user.deleted`)
4. Extract user data from payload
5. Insert into users table using Drizzle
6. Return 200 OK to Clerk

---

#### **Step 5: Add Webhook Secret to Environment**

**File:** `apps/backend/wrangler.toml`

Add Clerk webhook secret as environment variable:
```toml
[vars]
CLERK_WEBHOOK_SECRET = "whsec_xxx" # Get from Clerk dashboard
```

For local development, use `.dev.vars`:
```
CLERK_WEBHOOK_SECRET=whsec_xxx
```

Update Bindings type:
**File:** `apps/backend/src/types/bindings.ts`
```typescript
export interface Bindings {
  DB: D1Database;
  CLERK_WEBHOOK_SECRET: string;
}
```

---

#### **Step 6: Register Webhook in Hono**

**File:** `apps/backend/src/index.ts`

Import and register the webhook route:
```typescript
import webhooksRoute from './routes/webhooks';

app.route('/', webhooksRoute);
```

---

#### **Step 7: Configure Webhook in Clerk Dashboard**

1. Go to Clerk Dashboard → Webhooks
2. Click "Add Endpoint"
3. Enter webhook URL:
   - **Local:** Use ngrok or cloudflared tunnel (e.g., `https://your-tunnel.ngrok.io/api/webhooks/clerk`)
   - **Production:** `https://your-worker.workers.dev/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created` (required)
   - `user.updated` (optional - for syncing profile changes)
   - `user.deleted` (optional - for soft/hard deletes)
5. Copy the signing secret → Add to `wrangler.toml` / `.dev.vars`

---

#### **Step 8: Add Shared Types**

**File:** `packages/shared-types/src/index.ts`

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}
```

---

#### **Step 9: Test the Webhook**

**Local Testing:**
1. Start backend: `pnpm dev:backend`
2. Expose local endpoint with ngrok: `ngrok http 8787`
3. Configure webhook in Clerk with ngrok URL
4. Create a test user in Clerk
5. Check D1 database for new user record

**Clerk Dashboard Testing:**
- Use "Send Test Event" in webhook settings to simulate `user.created`

---

#### **Step 10: Handle Edge Cases**

**Duplicate Users:**
- Use `INSERT OR IGNORE` or check existence before insert
- Clerk user ID is unique, so use it as primary key

**Failed Webhooks:**
- Clerk automatically retries failed webhooks
- Log errors for debugging
- Return 200 even if user already exists (idempotency)

**User Updates:**
- Optionally handle `user.updated` webhook to sync profile changes
- Update email, name, or image URL in D1

**User Deletions:**
- Optionally handle `user.deleted` webhook
- Soft delete (add `deletedAt` field) or hard delete from D1

---

## Alternative: Server Action Approach (Option 2)

If you prefer to implement Option 2 (for simpler initial setup), here's the approach:

### Implementation Steps

#### **Step 1-2:** Same as Option 1 (create schema and migrate)

#### **Step 3:** Create User Creation API Endpoint

**File:** `apps/backend/src/routes/users.ts`

Create a protected endpoint:
- `POST /api/users`
- Accepts user data from frontend
- Validates Clerk session token
- Creates user in D1

**Authentication:**
Use Clerk's JWT verification in Hono middleware to ensure only authenticated requests can create users.

#### **Step 4:** Create Next.js Server Action

**File:** `apps/frontend/src/app/actions/create-user.ts`

```typescript
'use server'
import { auth, currentUser } from '@clerk/nextjs/server';

export async function createUserInDatabase() {
  const { userId } = await auth();
  const user = await currentUser();

  // Call Hono backend API to create user
  // POST /api/users with user data
}
```

#### **Step 5:** Call Server Action Post-Registration

**File:** `apps/frontend/src/app/sign-up/[[...sign-up]]/page.tsx`

After successful sign-up:
- Detect completion via Clerk's `useSignUp` hook
- Call `createUserInDatabase()` server action
- Handle success/error states

**Challenges:**
- Need to determine "when" registration is complete
- Handle race conditions
- User can close browser before sync

---

## Files to Create/Modify

### **Option 1 (Webhooks - Recommended)**

**Create:**
- `apps/backend/src/routes/webhooks.ts` - Webhook endpoint handler
- `apps/backend/.dev.vars` - Local webhook secret (git-ignored)

**Modify:**
- `apps/backend/src/db/schema.ts` - Add users table
- `apps/backend/src/types/bindings.ts` - Add CLERK_WEBHOOK_SECRET
- `apps/backend/src/index.ts` - Register webhook route
- `apps/backend/wrangler.toml` - Add environment variable
- `apps/backend/package.json` - Add svix dependency
- `packages/shared-types/src/index.ts` - Add User types

**Generate:**
- Migration files via `pnpm db:generate`

### **Option 2 (Server Action)**

**Create:**
- `apps/backend/src/routes/users.ts` - User creation API
- `apps/frontend/src/app/actions/create-user.ts` - Server action
- `apps/backend/src/middleware/clerk-auth.ts` - JWT verification

**Modify:**
- Same schema/types files as Option 1
- `apps/frontend/src/app/sign-up/[[...sign-up]]/page.tsx` - Post-signup logic

---

## Dependencies

### **Option 1 (Webhooks)**
- `svix` (backend) - Webhook signature verification

### **Option 2 (Server Action)**
- `@clerk/backend` (backend) - JWT verification for API

Both options require:
- Drizzle schema changes (already using Drizzle)
- No frontend dependencies (already using `@clerk/nextjs`)

---

## Potential Challenges & Solutions

### **Challenge 1: Webhook Not Received Locally**

**Problem:** Can't test webhooks on localhost directly

**Solution:**
- Use ngrok, cloudflared tunnel, or Clerk's local webhook testing
- Command: `ngrok http 8787` or `cloudflared tunnel --url localhost:8787`

---

### **Challenge 2: Webhook Signature Verification Fails**

**Problem:** Svix verification throws error

**Solution:**
- Ensure webhook secret matches Clerk dashboard
- Check that request body is raw (not parsed)
- Verify all svix headers are present

---

### **Challenge 3: User Already Exists**

**Problem:** Webhook fires multiple times or user manually created

**Solution:**
- Use `INSERT OR IGNORE` in SQL
- Or check `await db.select().from(users).where(eq(users.id, clerkUserId))`
- Return 200 OK even if duplicate (idempotency)

---

### **Challenge 4: Race Condition in Lazy Creation (Option 3)**

**Problem:** Multiple requests check/create user simultaneously

**Solution:**
- Use database unique constraint on `id`
- Catch duplicate key errors gracefully
- Use transactions if needed

---

### **Challenge 5: Syncing Existing Clerk Users**

**Problem:** Already have users in Clerk before implementing sync

**Solution:**
- Create a one-time migration script
- Use Clerk's backend API to fetch all users
- Bulk insert into D1 database
- Or rely on lazy creation (Option 3) to backfill gradually

---

## Testing Plan

### **Unit Tests**
- Test webhook signature verification
- Test user creation logic with mock D1
- Test duplicate user handling

### **Integration Tests**
- Send test webhook from Clerk dashboard
- Verify user created in D1
- Test with different event types (created, updated, deleted)

### **Manual Testing**
1. Start local backend with ngrok tunnel
2. Configure webhook in Clerk dashboard
3. Create new user via Clerk sign-up flow
4. Verify user appears in D1:
   ```bash
   wrangler d1 execute next-hono-sqlite --local --command="SELECT * FROM users"
   ```
5. Check Clerk webhook logs for delivery status

---

## Deployment Checklist

- [ ] Run migrations on production D1: `pnpm db:migrate`
- [ ] Add `CLERK_WEBHOOK_SECRET` to Cloudflare Worker environment variables
- [ ] Deploy backend: `pnpm deploy:backend`
- [ ] Update Clerk webhook URL to production worker URL
- [ ] Test webhook with real sign-up in production
- [ ] Monitor Cloudflare Worker logs for errors
- [ ] Set up alerting for webhook failures

---

## Future Enhancements

1. **User Profile Syncing:** Handle `user.updated` webhook to keep D1 in sync
2. **Soft Deletes:** Handle `user.deleted` webhook with `deletedAt` timestamp
3. **Additional Fields:** Store phone number, OAuth metadata, etc.
4. **User Preferences:** Extend users table with app-specific settings
5. **Relationships:** Link users to other tables (posts, comments, etc.)
6. **Analytics:** Track user registration sources, timestamps

---

## Recommendation Summary

**For Production:** Use **Option 1 (Clerk Webhooks)**
- Most reliable and scalable
- Handles all registration methods
- Built-in retry mechanism
- Clean separation of concerns

**For Quick Prototype:** Use **Option 2 (Server Action)**
- Faster initial setup
- No external configuration needed
- Good for MVP/testing

**For Simple Apps:** Use **Option 3 (Lazy Creation)**
- Minimal code
- User created on-demand
- Good when user record isn't critical immediately

---

## Next Steps

1. Choose implementation approach (recommend Option 1)
2. Review and approve this plan
3. Begin implementation starting with schema changes
4. Test locally with ngrok tunnel
5. Deploy to production
6. Monitor webhook delivery and error rates

---

**Questions to Consider:**

1. Do you want to sync profile updates from Clerk to D1? (handle `user.updated`)
2. Should deleted Clerk users be removed from D1? (handle `user.deleted`)
3. Do you have existing Clerk users that need backfilling?
4. Any additional user fields to store beyond name/email/image?
5. Should user creation be blocking or fire-and-forget?

Let me know which approach you'd like to proceed with, and I can begin the implementation!
