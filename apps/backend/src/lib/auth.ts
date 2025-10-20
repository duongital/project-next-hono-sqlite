import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { D1Database } from '@cloudflare/workers-types';
import { createDbClient } from '../db/client';
import * as schema from '../db/schema';
import type { Bindings } from '../types/bindings';

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
  env: Pick<
    Bindings,
    | 'FROM_EMAIL'
    | 'FROM_NAME'
    | 'MAILCHANNELS_DKIM_DOMAIN'
    | 'MAILCHANNELS_DKIM_SELECTOR'
    | 'MAILCHANNELS_DKIM_PRIVATE_KEY'
  >;
}) {
  const emailContent: any = {
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Login to Your App</h1>
              </div>
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; margin-bottom: 30px;">Your one-time verification code is:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 2px dashed #667eea;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">${token}</span>
                </div>
                <p style="font-size: 16px; margin: 30px 0;">Or click the button below to login automatically:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Login to Your App</a>
                </div>
                <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 30px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">This code will expire in 10 minutes.</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">If you didn't request this code, you can safely ignore this email.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      },
    ],
  };

  // Add DKIM signing if configured
  if (
    env.MAILCHANNELS_DKIM_DOMAIN &&
    env.MAILCHANNELS_DKIM_SELECTOR &&
    env.MAILCHANNELS_DKIM_PRIVATE_KEY
  ) {
    emailContent.personalizations[0].dkim_domain = env.MAILCHANNELS_DKIM_DOMAIN;
    emailContent.personalizations[0].dkim_selector = env.MAILCHANNELS_DKIM_SELECTOR;
    emailContent.personalizations[0].dkim_private_key = env.MAILCHANNELS_DKIM_PRIVATE_KEY;
  }

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mailchannels error:', errorText);
    throw new Error(`Failed to send email via Mailchannels: ${errorText}`);
  }
}

export function createAuth(db: D1Database, env: Bindings) {
  const drizzleDb = createDbClient(db);

  return betterAuth({
    database: drizzleAdapter(drizzleDb, {
      provider: 'sqlite',
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        verification: schema.authVerification,
        account: schema.authAccount,
      },
    }),
    emailAndPassword: {
      enabled: false, // We only want email OTP
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        await sendOTPEmail({
          to: user.email,
          token,
          magicLink: url,
          env,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      generateId: () => {
        // Use crypto.randomUUID() for Cloudflare Workers compatibility
        return crypto.randomUUID();
      },
    },
  });
}
