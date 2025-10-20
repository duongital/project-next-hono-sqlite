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

  // R2 Storage
  IMAGES_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string; // e.g., https://pub-xxxxx.r2.dev
};
