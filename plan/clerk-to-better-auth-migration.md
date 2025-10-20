# Clerk to Better Auth Migration Plan

**Created:** 2025-10-20
**Task:** Migrate from Clerk authentication to Better Auth with email OTP, JWT tokens, and Cloudflare Mailchannels

---

## Overview

This plan outlines the complete migration from Clerk to Better Auth for a Next.js 15 + Hono.js (Cloudflare Workers) application. The new authentication system will use:

- **Better Auth** for authentication framework
- **Email OTP (Magic Link)** for passwordless login
- **JWT tokens** (not session-based) for stateless authentication on Cloudflare Workers
- **Drizzle ORM** with Cloudflare D1 (SQLite) for database
- **Cloudflare Mailchannels** for transactional email delivery

### Key Objectives

1. Remove all Clerk dependencies and code
2. Implement Better Auth with email OTP authentication
3. Configure JWT-based authentication (stateless)
4. Set up Cloudflare Mailchannels for email delivery
5. Simplify database schema (remove unused tables, keep only auth-related tables)
6. Update frontend UI for new auth flow
7. Update backend middleware for JWT verification

---

## Technical Architecture

### Authentication Flow

```
1. User enters email → Frontend sends to Backend API
2. Backend generates OTP/Magic Link → Stores in DB → Sends email via Mailchannels
3. User clicks magic link or enters OTP → Frontend sends to Backend
4. Backend verifies OTP → Generates JWT token → Returns to Frontend
5. Frontend stores JWT in localStorage/cookie → Sends in Authorization header
6. Backend middleware verifies JWT on protected routes
```

### Tech Stack Changes

**Before (Clerk):**
- Frontend: `@clerk/nextjs` - ClerkProvider, SignIn/SignUp components
- Backend: `@clerk/backend` - verifyToken middleware
- Session: Managed by Clerk (external service)

**After (Better Auth):**
- Frontend: `better-auth/react` + custom UI components
- Backend: `better-auth` core library
- Database: Drizzle schema for auth tables (users, sessions, verifications, accounts)
- Email: Cloudflare Mailchannels API
- Tokens: JWT (stateless, no server-side sessions for API)

---

## Implementation Steps

### Phase 1: Setup & Dependencies

#### 1.1 Install Better Auth Dependencies

**Backend (apps/backend/package.json):**
```bash
pnpm add better-auth arctic jose
pnpm remove @clerk/backend svix
```

**Frontend (apps/frontend/package.json):**
```bash
pnpm add better-auth
pnpm remove @clerk/nextjs
```

**Shared Types (packages/shared-types/package.json):**
```bash
pnpm add better-auth
```

**Dependencies Explanation:**
- `better-auth`: Core authentication library
- `arctic`: OAuth provider support (not needed for email OTP, but Better Auth peer dependency)
- `jose`: JWT signing and verification (Cloudflare Workers compatible)

#### 1.2 Environment Variables

**Backend (.dev.vars & wrangler.toml secrets):**
```bash
# Better Auth
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:8787

# Cloudflare Mailchannels (no API key needed, uses CF Workers context)
MAILCHANNELS_DKIM_DOMAIN=yourdomain.com
MAILCHANNELS_DKIM_SELECTOR=mailchannels
MAILCHANNELS_DKIM_PRIVATE_KEY=<your-dkim-private-key>
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8787
```

---

### Phase 2: Database Schema Migration

#### 2.1 Create Better Auth Database Schema

**File: apps/backend/src/db/schema.ts**

Better Auth requires specific tables. We'll define them using Drizzle:

```typescript
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ============================================
// BETTER AUTH TABLES
// ============================================

// Users table (Better Auth core)
export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  name: text('name'),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Sessions table (Better Auth - for optional session management)
// Note: We'll use JWT primarily, but Better Auth requires this table
export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Verification tokens (for OTP/Magic Links)
export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(), // email
  value: text('value').notNull(), // OTP code or token
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Accounts table (for OAuth providers - optional, can add later)
export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
```

**Actions:**
1. Replace entire user/auth schema in `apps/backend/src/db/schema.ts`
2. Remove `todos`, `images`, `fruits`, `items`, `categories` tables (per requirements)
3. Keep only Better Auth tables listed above

#### 2.2 Generate and Apply Migrations

```bash
# Generate migration from new schema
pnpm db:generate

# Apply to local D1 database
pnpm db:migrate:local

# Later for production
pnpm db:migrate:prod
```

---

### Phase 3: Backend Implementation

#### 3.1 Configure Better Auth

**File: apps/backend/src/lib/auth.ts** (new file)

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { D1Database } from '@cloudflare/workers-types';
import { createDbClient } from '../db/client';
import * as schema from '../db/schema';

export function createAuth(db: D1Database, env: { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string; FROM_EMAIL: string; FROM_NAME: string }) {
  const drizzleDb = createDbClient(db);

  return betterAuth({
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.sessions,
        verification: schema.verifications,
        account: schema.accounts,
      },
    }),
    emailAndPassword: {
      enabled: false, // We only want email OTP
    },
    emailVerification: {
      enabled: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        // Custom email sender using Cloudflare Mailchannels
        await sendOTPEmail({
          to: user.email,
          token,
          magicLink: url,
          env,
        });
      },
    },
    session: {
      strategy: 'jwt', // JWT-based authentication (stateless)
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      generateId: () => {
        // Custom ID generation (Better Auth uses nanoid by default)
        return crypto.randomUUID();
      },
    },
  });
}

// Email sender function using Cloudflare Mailchannels
async function sendOTPEmail({
  to,
  token,
  magicLink,
  env,
}: {
  to: string;
  token: string;
  magicLink: string;
  env: { FROM_EMAIL: string; FROM_NAME: string };
}) {
  const emailContent = {
    personalizations: [
      {
        to: [{ email: to }],
      },
    ],
    from: {
      email: env.FROM_EMAIL,
      name: env.FROM_NAME,
    },
    subject: 'Your Login Code',
    content: [
      {
        type: 'text/html',
        value: `
          <h1>Login to Your App</h1>
          <p>Your one-time code is: <strong>${token}</strong></p>
          <p>Or click the magic link below:</p>
          <a href="${magicLink}">Login to Your App</a>
          <p>This code will expire in 10 minutes.</p>
        `,
      },
    ],
  };

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via Mailchannels: ${errorText}`);
  }
}
```

**Key Configuration Points:**
- **Adapter:** `drizzleAdapter` connects Better Auth to D1 via Drizzle
- **Strategy:** JWT-based sessions (stateless, no server-side session storage needed)
- **Email OTP:** Custom `sendVerificationEmail` function using Mailchannels API
- **ID Generation:** Using `crypto.randomUUID()` (Cloudflare Workers compatible)

#### 3.2 Update Backend Entry Point

**File: apps/backend/src/index.ts**

```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import type { Bindings } from './types/bindings';
import { createAuth } from './lib/auth';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// CORS
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:4200'],
    credentials: true,
  })
);

// Health check
app.get('/', (c) => c.json({ message: 'Better Auth API' }));

// Better Auth routes (handles /api/auth/*)
app.all('/api/auth/*', async (c) => {
  const auth = createAuth(c.env.DB, {
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
    FROM_EMAIL: c.env.FROM_EMAIL,
    FROM_NAME: c.env.FROM_NAME,
  });

  return auth.handler(c.req.raw);
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));
app.doc('/docs/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Better Auth API', version: '1.0.0' },
});

export default app;
```

**Notes:**
- Better Auth automatically creates routes under `/api/auth/*`:
  - `POST /api/auth/sign-in/email` - Send OTP
  - `POST /api/auth/sign-in/email/verify` - Verify OTP
  - `POST /api/auth/sign-out` - Sign out
  - `GET /api/auth/session` - Get current session

#### 3.3 Create JWT Authentication Middleware

**File: apps/backend/src/middleware/auth.ts** (replace existing)

```typescript
import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { Bindings } from '../types/bindings';

export type AuthContext = {
  userId: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export const jwtAuth = createMiddleware<{ Bindings: Bindings; Variables: AuthContext }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized - Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const secret = new TextEncoder().encode(c.env.BETTER_AUTH_SECRET);

      // Verify JWT token
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      const userId = payload.sub;
      if (!userId) {
        return c.json({ error: 'Unauthorized - Invalid token payload' }, 401);
      }

      // Set user context
      c.set('userId', userId);
      c.set('user', {
        id: userId,
        email: payload.email as string,
        name: payload.name as string | undefined,
      });

      await next();
    } catch (error) {
      console.error('JWT verification failed:', error);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
  }
);
```

**Notes:**
- Uses `jose` library (Cloudflare Workers compatible)
- Verifies JWT signature using `BETTER_AUTH_SECRET`
- Extracts user info from JWT payload and sets in context

#### 3.4 Update Bindings Type

**File: apps/backend/src/types/bindings.ts**

```typescript
export type Bindings = {
  DB: D1Database;

  // Better Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  // Email (Mailchannels)
  FROM_EMAIL: string;
  FROM_NAME: string;

  // Optional DKIM signing (for production)
  MAILCHANNELS_DKIM_DOMAIN?: string;
  MAILCHANNELS_DKIM_SELECTOR?: string;
  MAILCHANNELS_DKIM_PRIVATE_KEY?: string;
};
```

#### 3.5 Remove Clerk Webhook Route

**File: apps/backend/src/routes/webhooks.ts** - DELETE this file entirely

---

### Phase 4: Frontend Implementation

#### 4.1 Configure Better Auth Client

**File: apps/frontend/src/lib/auth-client.ts** (new file)

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:8787',
});

export const {
  signIn,
  signOut,
  useSession,
} = authClient;
```

#### 4.2 Create Auth Provider

**File: apps/frontend/src/components/auth-provider.tsx** (new file)

```typescript
'use client';

import { SessionProvider } from 'better-auth/react';
import { authClient } from '@/lib/auth-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider client={authClient}>
      {children}
    </SessionProvider>
  );
}
```

#### 4.3 Create Login UI Component

**File: apps/frontend/src/components/login-form.tsx** (new file)

```typescript
'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn.email({ email });
      setStep('verify');
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn.email.verify({ email, code: otp });
      // Better Auth will automatically redirect or update session
    } catch (err) {
      setError('Invalid verification code. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Enter Verification Code</h2>
        <p className="text-sm text-gray-600 mb-4">
          We sent a code to {email}
        </p>
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            maxLength={6}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Back to email
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      <form onSubmit={handleSendOTP} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Verification Code'}
        </button>
      </form>
    </div>
  );
}
```

#### 4.4 Update Root Layout

**File: apps/frontend/src/app/layout.tsx** (replace)

```typescript
import { type Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { UserNav } from '@/components/user-nav';
import './global.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Your App',
  description: 'Better Auth Authentication',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-50 to-slate-100`}
      >
        <AuthProvider>
          <header className="w-full flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-800">Your App</h1>
            </div>
            <UserNav />
          </header>
          <main className="w-full">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### 4.5 Create User Navigation Component

**File: apps/frontend/src/components/user-nav.tsx** (new file)

```typescript
'use client';

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';

export function UserNav() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium text-sm px-6 py-2 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">{session.user.email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm text-gray-600 hover:text-gray-800"
      >
        Sign Out
      </button>
    </div>
  );
}
```

#### 4.6 Create Login Page

**File: apps/frontend/src/app/login/page.tsx** (new file)

```typescript
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <LoginForm />
    </div>
  );
}
```

#### 4.7 Remove Clerk Middleware

**File: apps/frontend/src/middleware.ts** - DELETE this file entirely

Better Auth handles authentication client-side via React hooks, so no Next.js middleware is needed.

#### 4.8 Update API Client (if needed)

**File: apps/frontend/src/lib/api-client.ts**

Update to use Better Auth session token:

```typescript
import { authClient } from './auth-client';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await authClient.getSession();

    if (session?.token) {
      return {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      };
    }

    return {
      'Content-Type': 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  }

  // ... other methods
}
```

---

### Phase 5: Cloudflare Mailchannels Setup

#### 5.1 DNS Configuration

Cloudflare Mailchannels requires SPF and DKIM DNS records:

**SPF Record (TXT):**
```
Type: TXT
Name: @
Value: v=spf1 a mx include:relay.mailchannels.net ~all
```

**DKIM Record (TXT):**

First, generate a DKIM key pair:
```bash
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key
```

Then add DNS record:
```
Type: TXT
Name: mailchannels._domainkey
Value: v=DKIM1; p=<your-public-key-base64>
```

**Domain Lockdown (TXT) - Recommended:**
```
Type: TXT
Name: _mailchannels
Value: v=mc1 cfid=youraccount.workers.dev
```

This prevents others from sending emails on your behalf via Mailchannels.

#### 5.2 Update Email Sender with DKIM

**File: apps/backend/src/lib/auth.ts** - Update `sendOTPEmail` function:

```typescript
async function sendOTPEmail({
  to,
  token,
  magicLink,
  env,
}: {
  to: string;
  token: string;
  magicLink: string;
  env: {
    FROM_EMAIL: string;
    FROM_NAME: string;
    MAILCHANNELS_DKIM_DOMAIN?: string;
    MAILCHANNELS_DKIM_SELECTOR?: string;
    MAILCHANNELS_DKIM_PRIVATE_KEY?: string;
  };
}) {
  const emailContent: any = {
    personalizations: [
      {
        to: [{ email: to }],
        dkim_domain: env.MAILCHANNELS_DKIM_DOMAIN,
        dkim_selector: env.MAILCHANNELS_DKIM_SELECTOR,
        dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY,
      },
    ],
    from: {
      email: env.FROM_EMAIL,
      name: env.FROM_NAME,
    },
    subject: 'Your Login Code',
    content: [
      {
        type: 'text/html',
        value: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #4F46E5;">Login to Your App</h1>
              <p>Your one-time verification code is:</p>
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${token}</span>
              </div>
              <p>Or click the button below to login automatically:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your App</a>
              </div>
              <p style="color: #6B7280; font-size: 14px;">This code will expire in 10 minutes.</p>
              <p style="color: #6B7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
          </body>
          </html>
        `,
      },
    ],
  };

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email via Mailchannels: ${errorText}`);
  }
}
```

#### 5.3 Test Email Delivery

Create a test route to verify Mailchannels:

**File: apps/backend/src/routes/test-email.ts** (new file)

```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import type { Bindings } from '../types/bindings';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.get('/api/test-email/:email', async (c) => {
  const email = c.req.param('email');

  const emailContent = {
    personalizations: [
      {
        to: [{ email }],
      },
    ],
    from: {
      email: c.env.FROM_EMAIL,
      name: c.env.FROM_NAME,
    },
    subject: 'Test Email from Cloudflare Workers',
    content: [
      {
        type: 'text/plain',
        value: 'This is a test email sent via Mailchannels!',
      },
    ],
  };

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: errorText }, 500);
    }

    return c.json({ success: true, message: `Test email sent to ${email}` });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default app;
```

Test with: `GET http://localhost:8787/api/test-email/youremail@example.com`

---

### Phase 6: Cleanup & Removal

#### 6.1 Remove Clerk Files and Code

**Files to DELETE:**
- `apps/frontend/src/middleware.ts` (Clerk middleware)
- `apps/backend/src/routes/webhooks.ts` (Clerk webhooks)
- `plan/clerk-user-sync-to-d1.md` (old documentation)

**Code to REMOVE:**

In `apps/frontend/src/app/layout.tsx`:
- Remove `ClerkProvider`, `SignInButton`, `SignUpButton`, `SignedIn`, `SignedOut`, `UserButton` imports
- Remove all Clerk components from JSX

In `apps/backend/src/middleware/auth.ts`:
- Replace entire file with new JWT auth middleware

In `apps/backend/src/db/schema.ts`:
- Remove old `users` table (replace with Better Auth schema)
- Remove `todos`, `images`, `fruits`, `items`, `categories` tables

#### 6.2 Update Shared Types

**File: packages/shared-types/src/index.ts**

```typescript
// Better Auth types
export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
};

// API Response types
export type AuthResponse = {
  user: User;
  session: Session;
};

export type ErrorResponse = {
  error: string;
  message?: string;
};
```

#### 6.3 Remove Unused Dependencies

```bash
# Backend
cd apps/backend
pnpm remove @clerk/backend svix

# Frontend
cd apps/frontend
pnpm remove @clerk/nextjs
```

#### 6.4 Update Environment Variable Files

**Delete/Update:**
- Remove `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
- Remove `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Add:**
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `FROM_EMAIL`
- `FROM_NAME`
- `MAILCHANNELS_DKIM_DOMAIN` (optional)
- `MAILCHANNELS_DKIM_SELECTOR` (optional)
- `MAILCHANNELS_DKIM_PRIVATE_KEY` (optional)

---

## Testing Plan

### 1. Backend Testing

**Test Authentication Flow:**
```bash
# 1. Send OTP email
curl -X POST http://localhost:8787/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check email inbox for OTP code

# 3. Verify OTP
curl -X POST http://localhost:8787/api/auth/sign-in/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'

# Response should include JWT token

# 4. Test protected route with JWT
curl http://localhost:8787/api/protected \
  -H "Authorization: Bearer <jwt-token>"
```

**Test Email Delivery:**
```bash
curl http://localhost:8787/api/test-email/youremail@example.com
```

### 2. Frontend Testing

**Manual Test Flow:**
1. Navigate to `http://localhost:3000`
2. Click "Sign In" button
3. Enter email address
4. Check email for OTP code
5. Enter OTP code
6. Verify successful login (user email displayed in header)
7. Test sign out
8. Verify redirect to login page

**Test Protected Pages:**
1. Try accessing protected routes while logged out
2. Verify redirect to login page
3. Login and verify access granted

### 3. Integration Testing

**Test JWT Flow:**
1. Login via frontend
2. Inspect browser DevTools → Network → Check Authorization header
3. Verify JWT token is sent with API requests
4. Verify backend middleware accepts token

**Test Session Persistence:**
1. Login
2. Refresh page
3. Verify user remains logged in
4. Close browser
5. Reopen and verify session persists (if using localStorage/cookies)

---

## Deployment Checklist

### Backend (Cloudflare Workers)

1. Set environment variables in Cloudflare Dashboard:
   ```bash
   wrangler secret put BETTER_AUTH_SECRET
   wrangler secret put FROM_EMAIL
   wrangler secret put FROM_NAME
   wrangler secret put MAILCHANNELS_DKIM_DOMAIN
   wrangler secret put MAILCHANNELS_DKIM_SELECTOR
   wrangler secret put MAILCHANNELS_DKIM_PRIVATE_KEY
   ```

2. Update `wrangler.toml`:
   ```toml
   [vars]
   BETTER_AUTH_URL = "https://your-worker.workers.dev"
   ```

3. Run database migrations:
   ```bash
   pnpm db:migrate:prod
   ```

4. Deploy:
   ```bash
   pnpm deploy:backend
   ```

### Frontend (Vercel)

1. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`: Your Cloudflare Worker URL
   - `NEXT_PUBLIC_BETTER_AUTH_URL`: Same as API URL

2. Deploy via Git push or Vercel CLI

3. Test authentication flow in production

### DNS Configuration

1. Add SPF record
2. Add DKIM record (with public key)
3. Add domain lockdown record
4. Verify DNS propagation (use `dig` or online DNS checker)

---

## Potential Challenges & Solutions

### Challenge 1: Mailchannels Email Delivery Issues

**Problem:** Emails not being delivered or going to spam

**Solutions:**
- Verify SPF and DKIM DNS records are correctly configured
- Add domain lockdown record to prevent abuse
- Use a real domain (not localhost) for `FROM_EMAIL`
- Check Cloudflare Workers logs for Mailchannels API errors
- Test with multiple email providers (Gmail, Outlook, etc.)

### Challenge 2: JWT Token Size

**Problem:** JWT tokens can be large if storing too much data

**Solutions:**
- Keep JWT payload minimal (only `userId`, `email`, `exp`)
- Use short expiration times and refresh tokens if needed
- Better Auth handles this automatically with sensible defaults

### Challenge 3: CORS Issues

**Problem:** Frontend can't make requests to backend API

**Solutions:**
- Ensure CORS middleware allows frontend origin
- Set `credentials: true` in CORS config
- Use `withCredentials: true` in frontend fetch requests (if using cookies)

### Challenge 4: Session Persistence

**Problem:** User logged out on page refresh

**Solutions:**
- Better Auth stores JWT in localStorage by default
- Verify `SessionProvider` wraps entire app
- Check browser console for session errors

### Challenge 5: Database Migration Conflicts

**Problem:** Existing data conflicts with new schema

**Solutions:**
- Since requirement is to "ignore all current database", we can safely drop all tables
- Generate fresh migrations from Better Auth schema
- For production, backup existing data first if needed

### Challenge 6: Better Auth + Cloudflare Workers Compatibility

**Problem:** Better Auth is designed for Node.js environments

**Solutions:**
- Better Auth v2 supports edge runtimes (Cloudflare Workers)
- Use `jose` library for JWT (Web Crypto API compatible)
- Use Drizzle adapter (supports D1)
- Avoid Node.js-specific APIs

---

## Migration Timeline Estimate

**Phase 1: Setup & Dependencies** - 30 minutes
- Install packages
- Configure environment variables

**Phase 2: Database Schema** - 1 hour
- Update Drizzle schema
- Generate and test migrations
- Verify D1 database changes

**Phase 3: Backend Implementation** - 2-3 hours
- Configure Better Auth
- Implement email sender
- Update middleware
- Test authentication flow

**Phase 4: Frontend Implementation** - 2-3 hours
- Create auth components
- Update layouts and pages
- Implement login UI
- Test user flow

**Phase 5: Mailchannels Setup** - 1-2 hours
- Configure DNS records
- Test email delivery
- Implement DKIM signing

**Phase 6: Cleanup & Testing** - 1 hour
- Remove Clerk code
- Test entire flow
- Fix bugs

**Total Estimate:** 7-10 hours for complete migration

---

## Resources & Documentation

**Better Auth:**
- Docs: https://www.better-auth.com/docs/introduction
- Next.js Integration: https://www.better-auth.com/docs/integrations/next
- Drizzle Adapter: https://www.better-auth.com/docs/adapters/drizzle

**Cloudflare Mailchannels:**
- API Docs: https://api.mailchannels.net/tx/v1/documentation
- Workers Integration: https://support.mailchannels.com/hc/en-us/articles/4565898358413
- DKIM Setup: https://support.mailchannels.com/hc/en-us/articles/7122849237389

**Drizzle ORM:**
- D1 Adapter: https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1
- Schema Reference: https://orm.drizzle.team/docs/sql-schema-declaration

**JWT (jose):**
- Docs: https://github.com/panva/jose
- Cloudflare Workers: https://github.com/panva/jose/blob/main/docs/README.md#runtime-support

---

## Post-Migration Improvements (Future)

1. **Add OAuth Providers:**
   - Google, GitHub authentication
   - Better Auth supports OAuth out of the box

2. **Rate Limiting:**
   - Limit OTP requests per email
   - Use Cloudflare KV for rate limit storage

3. **Email Templates:**
   - Use HTML email templates with better styling
   - Add company branding

4. **Admin Dashboard:**
   - User management UI
   - View authentication logs

5. **2FA (Two-Factor Authentication):**
   - Add TOTP support via Better Auth plugins

6. **Session Management:**
   - View active sessions
   - Revoke sessions from multiple devices

---

## Summary

This migration plan provides a complete roadmap for transitioning from Clerk to Better Auth with email OTP authentication. The new system will be:

- **Simpler:** No external auth service dependencies
- **Cost-effective:** Free email delivery via Mailchannels (built into Cloudflare Workers)
- **Stateless:** JWT-based authentication perfect for serverless environments
- **Type-safe:** Full TypeScript support with Drizzle ORM
- **Scalable:** Cloudflare's global edge network

The implementation is designed to be completed in a single development sprint, with clear testing and deployment steps.
