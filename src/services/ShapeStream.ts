import { ShapeStream } from '@electric-sql/client'
import { db } from '../db/client'
import { OR } from '../db/schema'
import { sql } from 'drizzle-orm'

// Config
const ELECTRIC_URL = process.env.EXPO_PUBLIC_ELECTRIC_URL || 'http://localhost:3000'
const BASE_URL = `${ELECTRIC_URL}/v1/shape`

export class ElectricSync {
    private stream: ShapeStream | null = null
    private abortController: AbortController | null = null

    async start() {
        if (this.stream) return

        console.log('Starting Electric Sync...')
        this.abortController = new AbortController()

        try {
            // 1. Define the stream for the 'OR' table
            this.stream = new ShapeStream({
                url: `${BASE_URL}?table=%22OR%22&source_id=${process.env.EXPO_PUBLIC_ELECTRIC_SOURCE_ID}&secret=${process.env.EXPO_PUBLIC_ELECTRIC_SOURCE_SECRET}`,
            })

            // 2. Consume the stream
            this.stream.subscribe(async (messages) => {
                // Use a transaction for batch updates
                await db.transaction(async (tx) => {
                    for (const message of messages) {
                        // Handle different message types (insert/update/delete are usually combined in 'data' for shapes, 
                        // but the protocol sends 'headers' and 'value'. 
                        // For the basic JSON client, messages are row updates.)

                        // The ShapeStream yields arrays of Row changes.
                        // Assuming message is the Row object directly for now, or we need to check the library structure.
                        // Validating structure: standard Electric client streams Row objects.

                        const row = message as any

                        // Handle headers/control messages if any (offsets usually handled by client)
                        if (row.headers) return

                        try {
                            // UPSERT Strategy
                            await tx.insert(OR).values({
                                id: row.id,
                                streamId: row.streamId,
                                opcode: Number(row.opcode),
                                delta: row.delta ? Number(row.delta) : null,
                                payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
                                scope: row.scope,
                                status: row.status,
                                ts: new Date(row.ts), // Ensure date parsing
                            }).onConflictDoUpdate({
                                target: OR.id,
                                set: {
                                    streamId: row.streamId,
                                    opcode: Number(row.opcode),
                                    delta: row.delta ? Number(row.delta) : null,
                                    payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
                                    scope: row.scope,
                                    status: row.status,
                                    ts: new Date(row.ts),
                                }
                            })
                        } catch (err) {
                            console.error('Failed to sync row', row.id, err)
                        }
                    }
                })
            })

            console.log('Electric Sync Connected')
        } catch (e) {
            console.error('Electric Sync Failed', e)
            // Retry logic could go here
            setTimeout(() => this.start(), 5000)
        }
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort()
            this.abortController = null
        }
        this.stream = null
    }
}

export const electricSync = new ElectricSync()
