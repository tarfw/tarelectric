import { opsqlite } from '../db/client';
import { embeddingService } from './EmbeddingService';

export class VectorStore {
    private static instance: VectorStore;
    private initialized = false;

    private initPromise: Promise<void> | null = null;

    constructor() { }

    static getInstance(): VectorStore {
        if (!VectorStore.instance) {
            VectorStore.instance = new VectorStore();
        }
        return VectorStore.instance;
    }

    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // vec0 is the virtual table module provided by sqlite-vec
                // We store: rowid (implicit), id (data reference), embedding
                const createTableQuery = `
            CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0(
              id TEXT PRIMARY KEY,
              embedding FLOAT[384]
            );
          `;

                await opsqlite.execute(createTableQuery);
                console.log('Vector table initialized');
                this.initialized = true;
            } catch (e) {
                console.error('Failed to initialize vector table', e);
                this.initPromise = null;
                throw e;
            }
        })();

        return this.initPromise;
    }

    async addDocument(id: string, text: string) {
        if (!this.initialized) await this.init();

        const vector = await embeddingService.embed(text);

        // sqlite-vec expects raw float arrays (often serialization is handled by bindings, 
        // but op-sqlite with sqliteVec extension might expect just the array or a blob)
        // op-sqlite usually handles array -> blob or similar if configured?
        // Actually sqlite-vec inserts are standard INSERT INTO vectors(id, embedding) VALUES (...)
        // We passing the array directly.

        // Note: Parameter binding for arrays in op-sqlite needs verification. 
        // If it fails, might need to serialize to Float32Array or Buffer.

        try {
            // Manual UPSERT: Delete first then Insert
            // "INSERT OR REPLACE" can trigger unique constraint errors on some virtual tables
            // Sequential execution to avoid missing transaction API issues
            await opsqlite.execute('DELETE FROM vectors WHERE id = ?', [id]);
            await opsqlite.execute(
                'INSERT INTO vectors(id, embedding) VALUES (?, ?)',
                [id, new Float32Array(vector)]
            );
            console.log(`Stored vector for doc ${id.slice(0, 8)}`);
        } catch (e) {
            console.error('Error adding document to vector store', e);
        }
    }

    async deleteDocument(id: string) {
        if (!this.initialized) await this.init();

        try {
            opsqlite.execute('DELETE FROM vectors WHERE id = ?', [id]);
        } catch (e) {
            console.error('Error deleting document from vector store', e);
        }
    }

    async search(query: string, limit: number = 5): Promise<any[]> {
        if (!this.initialized) await this.init();

        const vector = await embeddingService.embed(query);

        try {
            // KNN search using sqlite-vec
            const results = await opsqlite.execute(
                `
            SELECT
              id,
              distance
            FROM vectors
            WHERE embedding MATCH ?
            ORDER BY distance
            LIMIT ?
            `,
                [new Float32Array(vector), limit]
            );
            return results.rows || [];
        } catch (e) {
            console.error('Error searching vector store', e);
            return [];
        }
    }
}

export const vectorStore = VectorStore.getInstance();
