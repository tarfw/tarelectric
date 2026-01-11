import { createClient, Client } from '@libsql/client/web';

// Simple interface for the Long Memory data
export interface MemoryRow {
    id: string;
    title: string;
    content: string;
    distance?: number;
    meta?: any;
}

export class TursoServerService {
    private client: Client;

    constructor() {
        const url = process.env.EXPO_PUBLIC_TURSO_DB_URL || process.env.TURSO_DB_URL;
        const authToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

        if (!url || !authToken) {
            console.warn('Turso credentials missing in environment variables (TURSO_DB_URL, TURSO_AUTH_TOKEN)');
        }

        this.client = createClient({
            url: url || 'http://localhost:8080', // Fallback to HTTP to satisfy 'web' client validation
            authToken: authToken || '',
        });
    }

    /**
     * Search specifically for memories using vector similarity
     * Note: This assumes you have an external embedding function or the DB has a vector index
     */
    async search(vector: number[], limit = 5): Promise<MemoryRow[]> {
        try {
            const vectorStr = JSON.stringify(vector);
            const rs = await this.client.execute({
                sql: `
                    SELECT id, title, content, meta, 
                           vector_distance_cos(embedding, vector32(?)) as distance
                    FROM memories
                    ORDER BY distance ASC
                    LIMIT ?
                `,
                args: [vectorStr, limit]
            });

            return rs.rows as unknown as MemoryRow[];
        } catch (e) {
            console.error('Turso Server Search Error:', e);
            return [];
        }
    }

    /**
     * Get a specific memory by ID or flexible query
     */
    async get(id: string): Promise<MemoryRow | null> {
        try {
            const rs = await this.client.execute({
                sql: "SELECT id, title, content, meta FROM memories WHERE id = ?",
                args: [id]
            });
            if (rs.rows.length > 0) return rs.rows[0] as unknown as MemoryRow;
            return null;
        } catch (e) {
            console.error('Turso Server Get Error:', e);
            return null;
        }
    }

    /**
     * List recent memories regarding a topic (simple text match)
     */
    async listByTopic(topic: string, limit = 5): Promise<MemoryRow[]> {
        try {
            const rs = await this.client.execute({
                sql: "SELECT id, title, content, meta FROM memories WHERE title LIKE ? OR content LIKE ? LIMIT ?",
                args: [`%${topic}%`, `%${topic}%`, limit]
            });
            return rs.rows as unknown as MemoryRow[];
        } catch (e) {
            console.error('Turso Server List Error:', e);
            return [];
        }
    }
}

export const tursoServerService = new TursoServerService();
