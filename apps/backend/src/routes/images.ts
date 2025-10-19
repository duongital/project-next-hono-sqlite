import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import type { Bindings } from '../types/bindings';
import { createDbClient } from '../db/client';
import { images } from '../db/schema';
import { clerkAuth, type AuthContext } from '../middleware/auth';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

// Apply authentication middleware to all routes
app.use('/*', clerkAuth);

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
  userId: z.string().openapi({ example: 'user_123abc' }),
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

// List all images for the authenticated user
const listImagesRoute = createRoute({
  method: 'get',
  path: '/api/images',
  tags: ['Images'],
  summary: 'List all images for the authenticated user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'List of images',
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

app.openapi(listImagesRoute, async (c) => {
  const userId = c.get('userId');

  const db = createDbClient(c.env.DB);
  const userImages = await db
    .select()
    .from(images)
    .where(eq(images.userId, userId))
    .orderBy(images.createdAt);

  return c.json({ images: userImages }, 200);
});

// Create image metadata and get presigned upload URL
const createImageRoute = createRoute({
  method: 'post',
  path: '/api/images',
  tags: ['Images'],
  summary: 'Create image metadata and get upload URL',
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

app.openapi(createImageRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const db = createDbClient(c.env.DB);

  // Generate unique R2 key
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const r2Key = `${userId}/${timestamp}-${randomStr}-${body.fileName}`;

  // Construct public URL
  const url = `${c.env.R2_PUBLIC_URL}/${r2Key}`;

  // Insert metadata into database
  const result = await db
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
    .returning();

  const image = result[0];

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
  path: '/api/images/:id/upload',
  tags: ['Images'],
  summary: 'Upload image file to R2',
  security: [{ Bearer: [] }],
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

app.openapi(uploadImageRoute, async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const db = createDbClient(c.env.DB);

  // Get image metadata
  const imageResults = await db
    .select()
    .from(images)
    .where(eq(images.id, id))
    .limit(1);

  if (imageResults.length === 0) {
    return c.json({ error: 'Image not found' }, 404);
  }

  const image = imageResults[0];

  // Verify ownership
  if (image.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get the file data from request body
  const fileData = await c.req.arrayBuffer();

  // Upload to R2
  await c.env.IMAGES_BUCKET.put(image.r2Key, fileData, {
    httpMetadata: {
      contentType: image.mimeType,
    },
  });

  return c.json(
    {
      success: true,
      url: image.url,
    },
    200
  );
});

// Delete image
const deleteImageRoute = createRoute({
  method: 'delete',
  path: '/api/images/:id',
  tags: ['Images'],
  summary: 'Delete an image',
  security: [{ Bearer: [] }],
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
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
  const userId = c.get('userId');
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

  // Verify ownership
  if (image.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

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
