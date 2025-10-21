import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Bindings } from '../types/bindings';
import { createDbClient } from '../db/client';
import { createOTP, verifyOTP, generateJWT, getOrCreateUser, markEmailAsVerified } from '../utils/auth';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Schemas
const SendOTPRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const SendOTPResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const VerifyOTPRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

const VerifyOTPResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    name: z.string().nullable(),
  }).optional(),
  message: z.string().optional(),
});

const ErrorResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Send OTP endpoint
const sendOTPRoute = createRoute({
  method: 'post',
  path: '/api/auth/send-otp',
  tags: ['Auth'],
  summary: 'Send OTP to email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SendOTPRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP sent successfully',
      content: {
        'application/json': {
          schema: SendOTPResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(sendOTPRoute, async (c) => {
  try {
    const { email } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Get origin for localhost detection
    const origin = c.req.header('origin') || c.req.header('host') || '';

    // Create OTP and send via email
    await createOTP(db, email, c.env.RESEND_API_KEY, undefined, origin);

    return c.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to send OTP',
      },
      400
    );
  }
});

// Verify OTP endpoint
const verifyOTPRoute = createRoute({
  method: 'post',
  path: '/api/auth/verify-otp',
  tags: ['Auth'],
  summary: 'Verify OTP and get JWT token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyOTPRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'OTP verified successfully',
      content: {
        'application/json': {
          schema: VerifyOTPResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid OTP',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(verifyOTPRoute, async (c) => {
  try {
    const { email, code } = c.req.valid('json');
    const db = createDbClient(c.env.DB);

    // Verify OTP
    const otpResult = await verifyOTP(db, email, code);
    if (!otpResult.success) {
      return c.json(
        {
          success: false,
          message: otpResult.error || 'Failed to verify OTP',
        },
        400
      );
    }

    // Get or create user
    const userId = await getOrCreateUser(db, email);

    // Mark email as verified
    await markEmailAsVerified(db, userId);

    // Generate JWT token
    const token = await generateJWT(userId, c.env.JWT_SECRET);

    // Get user details
    const { users } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .all();

    const user = userRecords[0];

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
      },
    }, 200);
  } catch (error) {
    console.error('Verify OTP error:', error);
    return c.json(
      {
        success: false,
        message: 'Failed to verify OTP',
      },
      400
    );
  }
});

export default app;
