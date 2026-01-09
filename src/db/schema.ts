import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'

/**
 * Operational/Working Memory Table
 */
export const OR = sqliteTable('OR', {
  id: text('id').primaryKey(),
  streamId: text('streamId').notNull(),
  opcode: integer('opcode').notNull(),
  delta: real('delta'),
  payload: text('payload', { mode: 'json' }).notNull(),
  scope: text('scope').notNull(), // private | shared
  status: text('status').notNull(), // active | done | closed
  ts: integer('ts', { mode: 'timestamp' }).notNull(), // timestamptz
})

/**
 * Collaboration and Scope Table
 */
export const Collab = sqliteTable('Collab', {
  userId: text('userId').notNull(),
  streamId: text('streamId').notNull(),
  role: text('role').notNull(),
  status: text('status').default('active').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.streamId] }),
}))

/**
 * Offline Mutation Queue
 * Stores actions to be synced when online
 */
export const MutationQueue = sqliteTable('MutationQueue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  table: text('table').notNull(),
  op: text('op').notNull(), // INSERT, UPDATE, DELETE
  data: text('data', { mode: 'json' }).notNull(), // The full row or diff
  synced: integer('synced', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

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
})

export type WorkingMemory = z.infer<typeof insertORSchema>

