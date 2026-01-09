import { pgTable, text, integer, real, timestamp, primaryKey, serial, boolean } from 'drizzle-orm/pg-core'

/**
 * Operational/Working Memory Table (Postgres)
 */
export const OR = pgTable('OR', {
    id: text('id').primaryKey(), // UUID stored as text or uuid datatype
    streamId: text('streamId').notNull(),
    opcode: integer('opcode').notNull(),
    delta: real('delta'),
    payload: text('payload').notNull(), // JSON content as text (or jsonb)
    scope: text('scope').notNull(),
    status: text('status').notNull(),
    ts: timestamp('ts', { withTimezone: true }).notNull(),
})

/**
 * Collaboration and Scope Table (Postgres)
 */
export const Collab = pgTable('Collab', {
    userId: text('userId').notNull(),
    streamId: text('streamId').notNull(),
    role: text('role').notNull(),
    status: text('status').default('active').notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.streamId] }),
}))


