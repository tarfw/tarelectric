const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client/web');

// 1. Load Secrets
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const secrets = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts[0] && parts[1]) secrets[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const url = secrets['EXPO_PUBLIC_TURSO_DB_URL'] || secrets['TURSO_DB_URL'];
const authToken = secrets['EXPO_PUBLIC_TURSO_AUTH_TOKEN'] || secrets['TURSO_AUTH_TOKEN'];

if (!url || !authToken) {
    console.error('Missing Turso Credentials');
    process.exit(1);
}

const client = createClient({ url, authToken });

async function seed() {
    console.log('Creating memories table (if needed)...');
    await client.execute(`
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            meta TEXT,
            embedding VECTOR(384),
            type TEXT DEFAULT 'memory'
        );
    `);

    console.log('Seeding Taxi Driver...');
    // Fake embedding (random 384 dim vector)
    const fakeVector = JSON.stringify(Array(384).fill(0).map(() => Math.random()));

    await client.execute({
        sql: `INSERT OR REPLACE INTO memories (id, title, content, meta, embedding, type) VALUES (?, ?, ?, ?, vector32(?), ?)`,
        args: [
            'taxi-001',
            'Taxi Driver: Ravi',
            'Ravi is a reliable taxi driver available in Chennai. Phone: 555-0199.',
            JSON.stringify({ type: 'driver', phone: '555-0199' }),
            fakeVector,
            'memory'
        ]
    });

    // Seed Milk Product
    console.log('Seeding Milk Product...');
    await client.execute({
        sql: `INSERT OR REPLACE INTO memories (id, title, content, meta, embedding, type) VALUES (?, ?, ?, ?, vector32(?), ?)`,
        args: [
            'prod-001',
            'Fresh Cow Milk',
            'Organic fresh cow milk available for daily delivery.',
            JSON.stringify({ type: 'product', price: 40 }),
            fakeVector,
            'memory'
        ]
    });

    console.log('✅ Seeding Complete. You can now ask "Book a taxi" or "Buy milk".');
}

seed().catch(console.error);
