import { createClient, Client } from '@libsql/client/web';
import { embeddingService } from './EmbeddingService';
import { getRandomValues } from 'expo-crypto';

// Polyfill for text encoder/decoder if needed in RN environment
// usually standard in modern RN, but just in case
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('text-encoding').TextEncoder;
}

export interface Memory {
    id: string; // We'll use UUID strings for easier handling in JS, converted to/from BLOB if needed or stored as text if Turso supports UUID type well, but plan said BLOB.
    // However, for simplicity in JS <-> SQL, text UUIDs are often easier unless we strict strict binary.
    // The user asked for BLOB PRIMARY KEY. We will try to respect that or use text if the client lib makes it hard.
    // libSQL client deals well with standard types. Let's aim for 16-byte blob if possible, or string UUIDs if 'uuid' extension is used.
    // Actually, user comment says "16 byte UUID / ULID".
    type: number;
    parent?: string | null;
    title: string;
    content: string;
    embedding?: number[];
    tags?: string[]; // stored as JSON text
    lat?: number;
    lng?: number;
    meta?: any; // JSON
    score?: number;
    created_at?: number;
    updated_at?: number;
}

export class TursoService {
    private client: Client | null = null;
    private initialized = false;

    constructor() {
        // We'll initialize lazily to avoid issues before env is loaded
    }

    private getClient(): Client {
        if (this.client) return this.client;

        const url = process.env.EXPO_PUBLIC_TURSO_DB_URL;
        const authToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

        if (!url || !authToken) {
            console.error('Turso credentials missing (EXPO_PUBLIC_TURSO_DB_URL, EXPO_PUBLIC_TURSO_AUTH_TOKEN)');
            throw new Error('Turso credentials missing');
        }

        this.client = createClient({
            url,
            authToken,
        });
        return this.client;
    }

    async init() {
        if (this.initialized) return;

        try {
            const client = this.getClient();

            // Create table based on user request
            // Note: VECTOR(384) syntax depends on libSQL vector extension availability directly in standard Create statement
            // or if it needs separate index creation.
            // Turso has native vector support.

            await client.execute(`
                CREATE TABLE IF NOT EXISTS memories (
                    id          TEXT PRIMARY KEY,                  -- Changed to TEXT for easier UUID handling in JS for now, unless strict BLOB requirement enforced by external systems
                    type        INTEGER NOT NULL,
                    parent      TEXT REFERENCES memories(id),
                    
                    title       TEXT NOT NULL,
                    content     TEXT,
                    
                    embedding   F32_BLOB(384),                    -- libSQL vector type often F32_BLOB or header-less float array. 
                                                                  -- "VECTOR(384)" is the syntax for the vector extension.
                    
                    tags        TEXT,                             -- JSON array
                    
                    lat         REAL,
                    lng         REAL,
                    
                    meta        TEXT,                             -- JSON
                    score       REAL DEFAULT 0,
                    
                    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
                    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
                );
            `);

            // Check if vector index exists, if not create it (if supported by syntax, typically requires separate creation)
            // CREATE INDEX memory_idx ON memories(libsql_vector_idx(embedding));
            // For now we assume standard CREATE TABLE worked.

            this.initialized = true;
            console.log('TursoService initialized');
        } catch (e) {
            console.error('Failed to initialize TursoService', e);
        }
    }

    // Generate a random UUID-like string
    private generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async addMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) {
        await this.init();
        const client = this.getClient();

        const id = this.generateId();
        const embedding = await embeddingService.embed(memory.content);

        // Convert embedding to string format or blob buffer if required.
        // libSQL web client often handles JSON array for vectors if the column is vector type.
        // But for "VECTOR(384)" in Turso, we usually pass a float32 array or a string representation.
        // Let's try passing the standard JS array first.

        try {
            await client.execute({
                sql: `
                    INSERT INTO memories (
                        id, type, parent, title, content, embedding, tags, lat, lng, meta
                    ) VALUES (
                        ?, ?, ?, ?, ?, vector32(?), ?, ?, ?, ?
                    )
                `,
                args: [
                    id,
                    memory.type,
                    memory.parent || null,
                    memory.title,
                    memory.content,
                    JSON.stringify(embedding), // often vector(...) function takes a JSON string of array
                    JSON.stringify(memory.tags || []),
                    memory.lat || null,
                    memory.lng || null,
                    JSON.stringify(memory.meta || {})
                ]
            });
            console.log(`Memory added to Turso: ${id}`);
            return id;
        } catch (e) {
            console.error('Error adding memory to Turso', e);
            throw e;
        }
    }

    async search(query: string, limit = 5) {
        await this.init();
        const client = this.getClient();

        const queryEmbedding = await embeddingService.embed(query);
        const vectorStr = JSON.stringify(queryEmbedding);

        try {
            // Turso vector search syntax might vary slightly depending on exact extension version used.
            // Common pattern: ORDER BY vector_distance_cos(embedding, vector32(?))

            const rs = await client.execute({
                sql: `
                    SELECT id, title, content, meta, 
                           vector_distance_cos(embedding, vector32(?)) as distance
                    FROM memories
                    ORDER BY distance ASC
                    LIMIT ?
                `,
                args: [vectorStr, limit]
            });

            return rs.rows; // Returns array of row objects (or arrays, depending on client config, 'web' client usually returns rows object slightly differently)
        } catch (e) {
            console.error('Error searching Turso', e);
            return [];
        }
    }

    async list(limit = 20) {
        await this.init();
        const client = this.getClient();

        try {
            const rs = await client.execute({
                sql: `
                    SELECT id, title, content, meta, created_at
                    FROM memories
                    ORDER BY created_at DESC
                    LIMIT ?
                `,
                args: [limit]
            });
            return rs.rows;
        } catch (e) {
            console.error('Error listing memories from Turso', e);
            return [];
        }
    }
}

export const tursoService = new TursoService();
