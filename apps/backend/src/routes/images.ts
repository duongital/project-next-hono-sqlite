import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import type { Bindings } from '../types/bindings';
import { createDbClient } from '../db/client';
import { images } from '../db/schema';
import { createLogger } from '../middleware/logging';
import { createDbLogger } from '../utils/db-logger';
import { jwtAuth } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings }>();

// Create a separate app for authenticated routes
const authenticatedApp = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>();
authenticatedApp.use('*', jwtAuth);

// Schemas
const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const CreateImageRequestSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// List current user's images (requires authentication)
authenticatedApp.get('/api/images/gallery', async (c) => {
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const userId = c.get('userId');

  logger.info('Fetching user gallery', { userId });

  const userImages = await db
    .select()
    .from(images)
    .where(eq(images.userId, userId))
    .orderBy(images.createdAt);

  return c.json({ images: userImages }, 200);
});

// List all images (legacy endpoint - kept for backward compatibility)
app.get('/api/images', async (c) => {
  const db = createDbClient(c.env.DB);
  const allImages = await db
    .select()
    .from(images)
    .orderBy(images.createdAt);

  return c.json({ images: allImages }, 200);
});

// Create image metadata and get upload URL (authenticated - for user's gallery)
authenticatedApp.post('/api/images/gallery', zValidator('json', CreateImageRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient(c.env.DB);
  const logger = createLogger(c);
  const dbLogger = createDbLogger(logger);
  const userId = c.get('userId');

  logger.info('Creating image metadata for user', {
    userId,
    fileName: body.fileName,
    fileSize: body.fileSize,
    mimeType: body.mimeType,
  });

  // Generate unique R2 key with userId prefix for organization
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const r2Key = `${userId}/${timestamp}-${randomStr}-${body.fileName}`;

  // Construct public URL
  const url = `${c.env.R2_PUBLIC_URL}/${r2Key}`;

  // Insert metadata into database with userId
  const result = await dbLogger.logQuery('INSERT', 'images', async () =>
    db
      .insert(images)
      .values({
        userId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        r2Key,
        url,
        width: body.width || null,
        height: body.height || null,
      })
      .returning()
  );

  const image = result[0];

  logger.info('Image metadata created', {
    imageId: image.id,
    userId,
    r2Key,
  });

  // For direct upload, we'll return the image metadata
  // The frontend will upload directly to R2 using the r2Key
  return c.json(
    {
      image,
      uploadUrl: `/api/images/${image.id}/upload`,
    },
    201
  );
});

// Upload image file to R2
app.put('/api/images/:id/upload', zValidator('param', IdParamSchema), async (c) => {
  const logger = createLogger(c);
  const dbLogger = createDbLogger(logger);

  try {
    const { id } = c.req.valid('param');
    const db = createDbClient(c.env.DB);

    logger.info('Starting image upload', { imageId: id });

    // Check if R2 is configured (try both binding names)
    const bucket = c.env.IMAGES_BUCKET || (c.env as any).next_hono_sqlite;
    if (!bucket) {
      logger.error('R2 bucket not configured', undefined, {
        availableEnvKeys: Object.keys(c.env),
      });
      return c.json({ error: 'R2 storage not configured. Please configure R2 bucket in wrangler.toml' }, 500);
    }

    // Get image metadata
    const imageResults = await dbLogger.logQuery('SELECT', 'images', async () =>
      db
        .select()
        .from(images)
        .where(eq(images.id, id))
        .limit(1)
    );

    if (imageResults.length === 0) {
      logger.warn('Image not found', { imageId: id });
      return c.json({ error: 'Image not found' }, 404);
    }

    const image = imageResults[0];

    // Get the file data from request body
    const fileData = await c.req.arrayBuffer();

    logger.info('Uploading to R2', {
      r2Key: image.r2Key,
      fileSize: fileData.byteLength,
    });

    // Upload to R2
    await bucket.put(image.r2Key, fileData, {
      httpMetadata: {
        contentType: image.mimeType,
      },
    });

    logger.info('Image uploaded successfully', {
      imageId: id,
      r2Key: image.r2Key,
      fileSize: fileData.byteLength,
    });

    return c.json(
      {
        success: true,
        url: image.url,
      },
      200
    );
  } catch (error) {
    logger.error('Image upload failed', error, {
      imageId: c.req.valid('param').id,
    });
    return c.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Delete image
app.delete('/api/images/:id', zValidator('param', IdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  // Get image metadata to get R2 key
  const imageResults = await db
    .select()
    .from(images)
    .where(eq(images.id, id))
    .limit(1);

  if (imageResults.length === 0) {
    return c.json({ error: 'Image not found' }, 404);
  }

  const image = imageResults[0];

  // Delete from R2
  await c.env.IMAGES_BUCKET.delete(image.r2Key);

  // Delete from database
  await db.delete(images).where(eq(images.id, id));

  return c.json(
    {
      success: true,
      message: 'Image deleted successfully',
    },
    200
  );
});

// Merge authenticated routes LAST to ensure /api/images/gallery takes precedence over /api/images/{id}
app.route('/', authenticatedApp);

export default app;
