import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../types/bindings';
import { createDbClient } from '../db/client';
import { createOTP, verifyOTP, generateJWT, getOrCreateUser, markEmailAsVerified } from '../utils/auth';

const app = new Hono<{ Bindings: Bindings }>();

// Schemas
const SendOTPRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const VerifyOTPRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

// Send OTP endpoint
app.post('/api/auth/send-otp', zValidator('json', SendOTPRequestSchema), async (c) => {
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
app.post('/api/auth/verify-otp', zValidator('json', VerifyOTPRequestSchema), async (c) => {
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
