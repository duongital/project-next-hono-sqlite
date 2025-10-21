import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Items table (existing)
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Fruits table (new)
export const fruits = sqliteTable('fruits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').notNull().default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export types
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Fruit = typeof fruits.$inferSelect;
export type NewFruit = typeof fruits.$inferInsert;

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

// Users table - Scalable design for multiple auth methods
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID v4
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  name: text('name'),
  avatar: text('avatar'), // For profile pictures / social login profile pics
  // Scalable fields for future auth methods
  provider: text('provider').default('email'), // 'email', 'google', 'github', 'passkey', etc.
  providerAccountId: text('provider_account_id'), // ID from social provider
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// OTP table for email verification
export const otp = sqliteTable('otp', {
  id: text('id').primaryKey(), // UUID v4
  userId: text('user_id'),
  email: text('email').notNull(), // Store email in case user doesn't exist yet
  code: text('code').notNull(), // 6-digit OTP
  expiresAt: integer('expires_at').notNull(), // Unix timestamp
  isUsed: integer('is_used', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export user types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Export OTP types
export type OTP = typeof otp.$inferSelect;
export type NewOTP = typeof otp.$inferInsert;

// Todos table
export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task: text('task').notNull(),
  isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export todo types
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// Images table
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id'), // Foreign key to users table (nullable for backward compatibility with existing images)
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  mimeType: text('mime_type').notNull(),
  r2Key: text('r2_key').notNull().unique(), // unique key in R2 bucket
  url: text('url').notNull(), // public URL to access the image
  width: integer('width'),
  height: integer('height'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export image types
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

