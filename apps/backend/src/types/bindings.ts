export type Bindings = {
  DB: D1Database;
  CLERK_WEBHOOK_SECRET: string;
  CLERK_SECRET_KEY: string;
  IMAGES_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string; // e.g., https://pub-xxxxx.r2.dev
};
