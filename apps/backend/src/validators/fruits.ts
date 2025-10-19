import { z } from 'zod';

// Create fruit schema
export const CreateFruitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  price: z.number().positive('Price must be a positive number'),
  quantity: z.number().int('Quantity must be an integer').nonnegative('Quantity cannot be negative').default(0),
});

// Update fruit schema (all fields optional)
export const UpdateFruitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().positive().optional(),
  quantity: z.number().int().nonnegative().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Fruit response schema
export const FruitResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

// List fruits response
export const FruitsListResponseSchema = z.object({
  fruits: z.array(FruitResponseSchema),
  total: z.number().optional(),
});

// Create fruit response
export const CreateFruitResponseSchema = z.object({
  success: z.boolean(),
  id: z.number(),
  fruit: FruitResponseSchema,
});

// Types
export type CreateFruitInput = z.infer<typeof CreateFruitSchema>;
export type UpdateFruitInput = z.infer<typeof UpdateFruitSchema>;
export type FruitResponse = z.infer<typeof FruitResponseSchema>;
export type FruitsListResponse = z.infer<typeof FruitsListResponseSchema>;
export type CreateFruitResponse = z.infer<typeof CreateFruitResponseSchema>;
