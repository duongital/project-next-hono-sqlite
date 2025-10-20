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

// Users table (Clerk sync)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Clerk user ID (e.g., user_xxx)
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export user types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Todos table
export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task: text('task').notNull(),
  isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Export todo types
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// Images table
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
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

// ============================================
// BETTER AUTH TABLES
// ============================================

// Better Auth Users table (new auth system)
export const authUser = sqliteTable('auth_user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  name: text('name'),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Better Auth Sessions table
export const authSession = sqliteTable('auth_session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Better Auth Verification tokens (for OTP/Magic Links)
export const authVerification = sqliteTable('auth_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(), // email
  value: text('value').notNull(), // OTP code or token
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

// Better Auth Accounts table (for OAuth providers - optional for future use)
export const authAccount = sqliteTable('auth_account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

// Export Better Auth types
export type AuthUser = typeof authUser.$inferSelect;
export type NewAuthUser = typeof authUser.$inferInsert;
export type AuthSession = typeof authSession.$inferSelect;
export type AuthVerification = typeof authVerification.$inferSelect;
export type AuthAccount = typeof authAccount.$inferSelect;
