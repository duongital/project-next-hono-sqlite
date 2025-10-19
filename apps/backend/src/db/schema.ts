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
