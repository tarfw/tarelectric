import { open } from '@op-engineering/op-sqlite'
import { drizzle } from 'drizzle-orm/op-sqlite'
import * as schema from './schema'

// Create a database instance
const opsqlite = open({
    name: 'myDb.sqlite',
})

// Initialize Drizzle ORM
export const db = drizzle(opsqlite, { schema })
