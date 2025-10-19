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
