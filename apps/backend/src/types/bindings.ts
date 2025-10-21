export type Bindings = {
  DB: D1Database;

  // R2 Storage
  IMAGES_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string; // e.g., https://pub-xxxxx.r2.dev
};
