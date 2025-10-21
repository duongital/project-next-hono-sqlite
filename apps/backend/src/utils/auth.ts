import { SignJWT, jwtVerify } from 'jose';
import type { DbClient } from '../db/client';
import { otp, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendOTPEmail } from './email';

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate short random ID (8 characters)
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Create OTP record in database and send via email
export async function createOTP(
  db: DbClient,
  email: string,
  resendApiKey: string,
  userId?: string,
  origin?: string
): Promise<string> {
  const otpCode = generateOTP();
  const otpId = generateUUID();

  // OTP expires in 10 minutes
  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;

  await db
    .insert(otp)
    .values({
      id: otpId,
      userId: userId || null,
      email,
      code: otpCode,
      expiresAt,
      isUsed: false,
    })
    .run();

  // Check if running on localhost for development
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');

  if (isLocalhost) {
    // Development: log OTP to console instead of sending email
    console.log(`[OTP] Development Mode - Email: ${email}, Code: ${otpCode}`);
  } else {
    // Production: send OTP via email using Resend service
    try {
      await sendOTPEmail({
        to: email,
        otpCode,
        resendApiKey,
      });
      console.log(`[OTP] Email sent successfully to: ${email}`);
    } catch (error) {
      console.error(`[OTP] Failed to send email to ${email}:`, error);
      // Log to console as fallback
      console.log(`[OTP] Fallback - Email: ${email}, Code: ${otpCode}`);
      // Don't throw - allow OTP to be created even if email fails
    }
  }

  return otpCode;
}

// Verify OTP
export async function verifyOTP(
  db: DbClient,
  email: string,
  code: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const now = Math.floor(Date.now() / 1000);

  // Find unused OTP that matches and hasn't expired
  const otpRecord = await db
    .select()
    .from(otp)
    .where(eq(otp.email, email))
    .orderBy(otp.createdAt)
    .limit(1)
    .all();

  if (!otpRecord || otpRecord.length === 0) {
    return { success: false, error: 'OTP not found' };
  }

  const record = otpRecord[otpRecord.length - 1]; // Get the latest OTP

  // Check if OTP is valid
  if (record.code !== code) {
    return { success: false, error: 'Invalid OTP' };
  }

  if (record.isUsed) {
    return { success: false, error: 'OTP already used' };
  }

  if (record.expiresAt < now) {
    return { success: false, error: 'OTP expired' };
  }

  // Mark OTP as used
  await db.update(otp).set({ isUsed: true }).where(eq(otp.id, record.id)).run();

  return { success: true, userId: record.userId || undefined };
}

// Generate JWT token (24 hour expiry)
export async function generateJWT(
  userId: string,
  secret: string
): Promise<string> {
  const jwt = new SignJWT({ sub: userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h');

  const token = await jwt.sign(new TextEncoder().encode(secret));
  return token;
}

// Verify JWT token
export async function verifyJWT(
  token: string,
  secret: string
): Promise<{ userId: string | null; error?: string }> {
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));

    const userId = verified.payload.sub;
    if (!userId) {
      return { userId: null, error: 'Invalid token' };
    }

    return { userId };
  } catch (error) {
    return { userId: null, error: 'Token verification failed' };
  }
}

// Get or create user by email
export async function getOrCreateUser(
  db: DbClient,
  email: string,
  name?: string
): Promise<string> {
  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .all();

  if (existingUser && existingUser.length > 0) {
    return existingUser[0].id;
  }

  // Create new user
  const userId = generateUUID();
  await db
    .insert(users)
    .values({
      id: userId,
      email,
      name: name || null,
      emailVerified: false,
      provider: 'email',
    })
    .run();

  return userId;
}

// Mark email as verified
export async function markEmailAsVerified(
  db: DbClient,
  userId: string
): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId))
    .run();
}
