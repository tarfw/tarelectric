import { db } from '../db/client'
import { MutationQueue } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../utils/supabase'

export class SyncService {
    private isProcessing = false

    constructor() {
        this.startAutoSync()
    }

    // Start listening to network changes
    private startAutoSync() {
        NetInfo.addEventListener(state => {
            if (state.isConnected) {
                this.processQueue()
            }
        })
    }

    // Add a mutation to the queue (called by UI)
    async enqueueMutation(table: string, op: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
        await db.insert(MutationQueue).values({
            table,
            op,
            data: JSON.stringify(data),
            synced: false,
            createdAt: new Date(),
        })

        // Try to process immediately if online
        const netState = await NetInfo.fetch()
        if (netState.isConnected) {
            this.processQueue()
        }
    }

    // Process pending mutations
    async processQueue() {
        if (this.isProcessing) return
        this.isProcessing = true

        try {
            // Get all unsynced mutations ordered by creation time (FIFO)
            const pendingMutations = await db.select().from(MutationQueue)
                .where(eq(MutationQueue.synced, false))
                .orderBy(asc(MutationQueue.createdAt))

            for (const mutation of pendingMutations) {
                try {
                    await this.syncToSupabase(mutation)

                    // Mark as synced (or delete)
                    await db.update(MutationQueue)
                        .set({ synced: true })
                        .where(eq(MutationQueue.id, mutation.id))

                    // Optional: Delete processed items to keep table small
                    // await db.delete(MutationQueue).where(eq(MutationQueue.id, mutation.id))

                } catch (err) {
                    console.error(`Failed to sync mutation ${mutation.id}:`, err)
                    // Stop processing if order matters, or continue to next?
                    // For now, we stop to preserve causal ordering
                    break
                }
            }
        } finally {
            this.isProcessing = false
        }
    }

    private async syncToSupabase(mutation: any) {
        const data = JSON.parse(mutation.data)
        const { table, op } = mutation

        let result
        if (op === 'INSERT') {
            result = await supabase.from(table).insert(data)
        } else if (op === 'UPDATE') {
            // Assuming 'id' is present in data for updates
            const { id, ...updates } = data
            result = await supabase.from(table).update(updates).eq('id', id)
        } else if (op === 'DELETE') {
            result = await supabase.from(table).delete().eq('id', data.id)
        }

        if (result?.error) {
            throw new Error(result.error.message)
        }
    }
}

export const syncService = new SyncService()
