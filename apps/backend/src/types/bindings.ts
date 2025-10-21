export type Bindings = {
  DB: D1Database;

  // JWT
  JWT_SECRET: string; // Secret key for signing JWT tokens

  // R2 Storage
  IMAGES_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string; // e.g., https://pub-xxxxx.r2.dev
};
