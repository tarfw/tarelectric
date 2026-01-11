import { pgTable, text, integer, real, boolean, timestamp, primaryKey, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Operational/Working Memory Table (Postgres Version)
 */
export const OR = pgTable('OR', {
  id: text('id').primaryKey(), // UUID string
  streamId: text('streamId').notNull(),
  opcode: integer('opcode').notNull(),
  delta: real('delta'),
  payload: jsonb('payload').notNull(),
  scope: text('scope').notNull(), // private | shared
  status: text('status').notNull(), // active | done | closed
  ts: timestamp('ts', { mode: 'date' }).notNull(),
});

/**
 * Collaboration and Scope Table (Postgres Version)
 */
export const Collab = pgTable('Collab', {
  userId: text('userId').notNull(),
  streamId: text('streamId').notNull(),
  role: text('role').notNull(),
  status: text('status').default('active').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.streamId] }),
}));

/**
 * Offline Mutation Queue (Postgres Version)
 * Stores actions to be synced when online
 */
export const MutationQueue = pgTable('MutationQueue', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  table: text('table').notNull(),
  op: text('op').notNull(), // INSERT, UPDATE, DELETE
  data: jsonb('data').notNull(), // The full row or diff
  synced: boolean('synced').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull(),
});

// Validation schemas (base)
export const insertORSchema = z.object({
  id: z.string(),
  streamId: z.string(),
  opcode: z.number(),
  delta: z.number().optional(),
  payload: z.any(),
  scope: z.enum(['private', 'shared']),
  status: z.enum(['active', 'done', 'closed']),
  ts: z.date(),
});

export type WorkingMemory = z.infer<typeof insertORSchema>;
