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

            // Check if exists
            const existing = await this.db.executeAsync(
                'SELECT doc_id FROM vector_store WHERE doc_id = ?',
                [docId]
            );

            const isInsert = existing.rows?._array?.length === 0;

            if (isInsert) {
                await this.db.executeAsync(
                    'INSERT INTO vector_store (doc_id, vector, content, metadata) VALUES (?, ?, ?, ?)',
                    [docId, vectorJson, content, metaJson]
                );
                // console.log(`Stored vector for doc ${docId}`);
            } else {
                await this.db.executeAsync(
                    'UPDATE vector_store SET vector = ?, content = ?, metadata = ? WHERE doc_id = ?',
                    [vectorJson, content, metaJson, docId]
                );
                // console.log(`Updated vector for doc ${docId}`);
            }

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

    async search(queryVector: number[], limit = 5) {
        await this.ready;
        try {
            const allDocs = await this.db.executeAsync('SELECT * FROM vector_store');

            if (!allDocs.rows?._array) return [];

            const scored = allDocs.rows._array.map((row: any) => {
                const vec = JSON.parse(row.vector);
                const score = this.cosineSimilarity(queryVector, vec);
                return { ...row, score };
            });

            return scored.sort((a: any, b: any) => b.score - a.score).slice(0, limit);

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
}

export const vectorStore = new VectorStore();
