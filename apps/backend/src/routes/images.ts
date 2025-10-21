import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import type { Bindings } from '../types/bindings';
import { createDbClient } from '../db/client';
import { images } from '../db/schema';
import { createLogger } from '../middleware/logging';
import { createDbLogger } from '../utils/db-logger';
import { jwtAuth } from '../middleware/auth';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// Create a separate app for authenticated routes
const authenticatedApp = new OpenAPIHono<{ Bindings: Bindings; Variables: { userId: string } }>();
authenticatedApp.use('*', jwtAuth);

// Schemas
const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number).openapi({
    param: {
      name: 'id',
      in: 'path',
    },
    example: '1',
  }),
});

const ImageSchema = z.object({
  id: z.number().openapi({ example: 1 }),
  userId: z.string().nullable().openapi({ example: 'user_123abc' }),
  fileName: z.string().openapi({ example: 'photo.jpg' }),
  fileSize: z.number().openapi({ example: 1024000 }),
  mimeType: z.string().openapi({ example: 'image/jpeg' }),
  r2Key: z.string().openapi({ example: 'user_123/1234567890-abc123-photo.jpg' }),
  url: z.string().openapi({ example: 'https://pub-xxxxx.r2.dev/user_123/1234567890-abc123-photo.jpg' }),
  width: z.number().nullable().openapi({ example: 1920 }),
  height: z.number().nullable().openapi({ example: 1080 }),
  createdAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
  updatedAt: z.string().nullable().openapi({ example: '2025-10-19T12:00:00.000Z' }),
});

const CreateImageRequestSchema = z.object({
  fileName: z.string().openapi({ example: 'photo.jpg' }),
  fileSize: z.number().openapi({ example: 1024000 }),
  mimeType: z.string().openapi({ example: 'image/jpeg' }),
  width: z.number().optional().openapi({ example: 1920 }),
  height: z.number().optional().openapi({ example: 1080 }),
});

const ImageUploadResponseSchema = z.object({
  image: ImageSchema,
  uploadUrl: z.string().openapi({ example: '/api/images/1/upload' }),
});

const ImagesListResponseSchema = z.object({
  images: z.array(ImageSchema),
});

const DeleteResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: 'Image deleted successfully' }),
});

const UploadSuccessSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  url: z.string().openapi({ example: 'https://pub-xxxxx.r2.dev/user_123/1234567890-abc123-photo.jpg' }),
});

const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'Not found' }),
});

// List current user's images (requires authentication)
const listUserImagesRoute = createRoute({
  method: 'get',
  path: '/api/images/gallery',
  tags: ['Images'],
  summary: 'List current user\'s images (requires authentication)',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'List of user images',
      content: {
        'application/json': {
          schema: ImagesListResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

authenticatedApp.openapi(listUserImagesRoute, async (c) => {
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

// Merge authenticated routes FIRST to ensure /api/images/gallery takes precedence over /api/images/{id}
app.route('/', authenticatedApp);

// List all images (legacy endpoint - kept for backward compatibility)
const listImagesRoute = createRoute({
  method: 'get',
  path: '/api/images',
  tags: ['Images'],
  summary: 'List all images (legacy - use /api/images/gallery for authenticated user images)',
  responses: {
    200: {
      description: 'List of images',
      content: {
        'application/json': {
          schema: ImagesListResponseSchema,
        },
      },
    },
  },
});

app.openapi(listImagesRoute, async (c) => {
  const db = createDbClient(c.env.DB);
  const allImages = await db
    .select()
    .from(images)
    .orderBy(images.createdAt);

  return c.json({ images: allImages }, 200);
});

// Create image metadata and get upload URL (authenticated - for user's gallery)
const createImageRoute = createRoute({
  method: 'post',
  path: '/api/images/gallery',
  tags: ['Images'],
  summary: 'Create image metadata and get upload URL (authenticated user only)',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateImageRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Image metadata created, upload URL provided',
      content: {
        'application/json': {
          schema: ImageUploadResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

authenticatedApp.openapi(createImageRoute, async (c) => {
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
const uploadImageRoute = createRoute({
  method: 'put',
  path: '/api/images/{id}/upload',
  tags: ['Images'],
  summary: 'Upload image file to R2',
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/octet-stream': {
          schema: z.any(),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image uploaded successfully',
      content: {
        'application/json': {
          schema: UploadSuccessSchema,
        },
      },
    },
    404: {
      description: 'Image not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'R2 storage not configured',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(uploadImageRoute, async (c) => {
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
const deleteImageRoute = createRoute({
  method: 'delete',
  path: '/api/images/{id}',
  tags: ['Images'],
  summary: 'Delete an image',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Image deleted successfully',
      content: {
        'application/json': {
          schema: DeleteResponseSchema,
        },
      },
    },
    404: {
      description: 'Image not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.openapi(deleteImageRoute, async (c) => {
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

export default app;
