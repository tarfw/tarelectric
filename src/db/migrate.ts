import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Database connection configuration
const connectionData = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
    host: process.env.DB_HOST || `localhost`,
    port: Number(process.env.DB_PORT) || 54321,
    user: process.env.DB_USER || `postgres`,
    password: process.env.DB_PASSWORD || `password`,
    database: process.env.DB_NAME || `electric`,
  }

const pool = new Pool(connectionData)

// Initialize Drizzle with the database connection
const db = drizzle(pool)

// Run migrations
async function main() {
  console.log(`Running migrations...`)

  try {
    await migrate(db, { migrationsFolder: `src/db/migrations` })
    console.log(`Migrations completed successfully!`)
  } catch (error) {
    console.error(`Migration failed:`, error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
