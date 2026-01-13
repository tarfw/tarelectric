import { ShapeStream } from '@electric-sql/client'
import { Platform } from 'react-native'
import { db } from '../db/client'
import { OR } from '../db/schema'
import { sql, eq } from 'drizzle-orm'
import { vectorStore } from './VectorStore'
import { embeddingService } from './EmbeddingService'

// Config
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000'
const ELECTRIC_URL = process.env.EXPO_PUBLIC_ELECTRIC_URL || DEFAULT_URL
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
                        const { headers, value } = message as any

                        // 1. Handle Control Messages (no value)
                        if (!value) {
                            if (headers.control === 'up-to-date') {
                                // console.log('[ShapeStream] Up to date')
                            }
                            continue
                        }

                        // 2. Handle Data Messages
                        const row = value
                        const operation = headers.operation // 'insert' | 'update' | 'delete'

                        try {
                            // Helper to safely parse dates (handles Postgres +00 offset)
                            const parseDate = (dateStr: any) => {
                                if (!dateStr) return new Date()
                                if (typeof dateStr === 'string' && dateStr.includes('+00') && !dateStr.includes(':00+00')) {
                                    return new Date(dateStr.replace('+00', 'Z'))
                                }
                                return new Date(dateStr)
                            }

                            if (operation === 'delete') {
                                await tx.delete(OR).where(eq(OR.id, row.id))
                                // Clean up vector index asynchronously
                                vectorStore.deleteDocument(row.id).catch(console.error)
                            } else if (operation === 'update') {
                                // For updates, only update the fields that are present
                                const updates: any = {}
                                if (row.streamId !== undefined) updates.streamId = row.streamId
                                if (row.opcode !== undefined) updates.opcode = Number(row.opcode)
                                if (row.delta !== undefined) updates.delta = Number(row.delta)
                                if (row.payload !== undefined) updates.payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload)
                                if (row.scope !== undefined) updates.scope = row.scope
                                if (row.status !== undefined) updates.status = row.status
                                if (row.ts !== undefined) updates.ts = parseDate(row.ts)

                                await tx.update(OR).set(updates).where(eq(OR.id, row.id))
                            } else {
                                // insert (or upsert to be safe, assuming full row)
                                await tx.insert(OR).values({
                                    id: row.id,
                                    streamId: row.streamId,
                                    opcode: Number(row.opcode),
                                    delta: row.delta ? Number(row.delta) : null,
                                    payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
                                    scope: row.scope,
                                    status: row.status,
                                    ts: parseDate(row.ts),
                                }).onConflictDoUpdate({
                                    target: OR.id,
                                    set: {
                                        streamId: row.streamId,
                                        opcode: Number(row.opcode),
                                        delta: row.delta ? Number(row.delta) : null,
                                        payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
                                        scope: row.scope,
                                        status: row.status,
                                        ts: parseDate(row.ts),
                                    }
                                })

                                // Index the payload for vector search
                                // Doing this async to not block the sync transaction
                                if (row.payload) {
                                    const textContent = typeof row.payload === 'string'
                                        ? row.payload
                                        : JSON.stringify(row.payload);

                                    // Generate embedding
                                    embeddingService.embed(textContent)
                                        .then((vector: number[]) => {
                                            vectorStore.addDocument(row.id, vector, textContent).catch(console.error);
                                        })
                                        .catch((e: any) => console.error('Failed to generate embedding for sync', e));
                                }
                            }
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
