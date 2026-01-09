import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

export default {
  schema: `./src/db/schema.ts`,
  out: `./src/db/migrations`,
  dialect: `postgresql`,
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 54321}/${process.env.DB_NAME || 'electric'}`,
  },
} satisfies Config
