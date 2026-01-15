import { open } from '@op-engineering/op-sqlite';

const DB_NAME = 'vectors.sqlite';

export class VectorStore {
    private db: any;
    private ready: Promise<void>;

    constructor() {
        this.ready = this.init();
    }

    private async init() {
        try {
            this.db = open({ name: DB_NAME });
            await this.db.executeAsync('PRAGMA journal_mode = WAL;');

            await this.db.executeAsync(`
        CREATE TABLE IF NOT EXISTS vector_store (
          doc_id TEXT PRIMARY KEY,
          vector TEXT NOT NULL,
          content TEXT,
          metadata TEXT
        );
      `);

            // console.log('Vector table initialized');
        } catch (e) {
            console.error('Failed to init vector db', e);
        }
    }

    async addDocument(docId: string, vector: number[], content: string, metadata?: any) {
        await this.ready;
        try {
            const vectorJson = JSON.stringify(vector);
            const metaJson = metadata ? JSON.stringify(metadata) : null;

            // Use INSERT OR REPLACE to avoid issues with existence check
            await this.db.executeAsync(
                'INSERT OR REPLACE INTO vector_store (doc_id, vector, content, metadata) VALUES (?, ?, ?, ?)',
                [docId, vectorJson, content, metaJson]
            );

        } catch (e) {
            console.error('Vector Store Add Error', e);
        }
    }

    async deleteDocument(docId: string) {
        await this.ready;
        try {
            await this.db.executeAsync(
                'DELETE FROM vector_store WHERE doc_id = ?',
                [docId]
            );
        } catch (e) {
            console.error('Vector Store Delete Error', e);
        }
    }

    async deleteDocuments(docIds: string[]) {
        if (!docIds.length) return;
        await this.ready;
        try {
            // Batch delete
            const placeholders = docIds.map(() => '?').join(',');
            await this.db.executeAsync(
                `DELETE FROM vector_store WHERE doc_id IN (${placeholders})`,
                docIds
            );
            console.log(`[VectorStore] Batch deleted ${docIds.length} vectors`);
        } catch (e) {
            console.error('Vector Store Batch Delete Error', e);
        }
    }

    async clear() {
        await this.ready;
        try {
            await this.db.executeAsync('DELETE FROM vector_store');
            console.log('[VectorStore] Cleared all vectors');
        } catch (e) {
            console.error('Vector Store Clear Error', e);
        }
    }

    async search(queryVector: number[], limit = 5) {
        await this.ready;
        try {
            const allDocs = await this.db.executeAsync('SELECT * FROM vector_store');

            // Handle different op-sqlite result structures
            const rows = allDocs.rows?._array || allDocs.rows || [];

            if (!rows.length) {
                console.log('[VectorStore] Search: No rows in vector_store');
                return [];
            }

            console.log(`[VectorStore] Search: Scanning ${rows.length} vectors`);

            const scored = rows.map((row: any) => {
                try {
                    const vec = JSON.parse(row.vector);
                    const score = this.cosineSimilarity(queryVector, vec);
                    // console.log(`[VectorStore] Doc ${row.doc_id} score: ${score}`);
                    return { ...row, score };
                } catch (e) {
                    console.error('Vector Parse Error', e);
                    return { ...row, score: 0 };
                }
            });

            const top = scored.sort((a: any, b: any) => b.score - a.score).slice(0, limit);
            console.log(`[VectorStore] Search: Returning top ${top.length} results`);
            return top;

        } catch (e) {
            console.error('Vector Search Error', e);
            return [];
        }
    }

    private cosineSimilarity(a: number[], b: number[]) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async getStats() {
        await this.ready;
        try {
            // Debug: Check raw count
            const countResult = await this.db.executeAsync('SELECT COUNT(*) as c FROM vector_store');
            // Fallback for different result structures (rows might be the array itself)
            const countRows = countResult.rows?._array || countResult.rows || [];
            const total = countRows[0]?.c ?? 0;

            // Debug: Check embedded count with simpler logic
            const embeddedResult = await this.db.executeAsync('SELECT COUNT(*) as c FROM vector_store WHERE vector IS NOT NULL');
            const embeddedRows = embeddedResult.rows?._array || embeddedResult.rows || [];
            const embedded = embeddedRows[0]?.c ?? 0;

            // console.log(`[VectorStore] Stats calculated: Total=${total}, Embedded=${embedded}`);
            return { total, embedded };
        } catch (e) {
            console.error('Vector Store Stats Error', e);
            return { total: 0, embedded: 0 };
        }
    }
}

export const vectorStore = new VectorStore();
