import { open } from '@op-engineering/op-sqlite'

const db = open({
  name: 'myDb.sqlite',
})

export async function initDatabase() {
  console.log('Initializing Database...')
  try {
    // OR Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "OR" (
        id TEXT PRIMARY KEY,
        streamId TEXT NOT NULL,
        opcode INTEGER NOT NULL,
        delta REAL,
        payload TEXT NOT NULL,
        scope TEXT NOT NULL,
        status TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
    `)

    // Collab Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Collab (
        userId TEXT NOT NULL,
        streamId TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        PRIMARY KEY (userId, streamId)
      );
    `)

    // MutationQueue Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS MutationQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        "table" TEXT NOT NULL,
        op TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON
        synced INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
        createdAt INTEGER NOT NULL
      );
    `)

    console.log('Database initialized successfully')
  } catch (e) {
    console.error('Failed to init database', e)
  }
}
