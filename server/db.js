import './env.js'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
function verifiedConnectionString(value) {
  const url = new URL(value)
  url.searchParams.set('sslmode', 'verify-full')
  return url.toString()
}
export const pool = connectionString ? new pg.Pool({ connectionString: verifiedConnectionString(connectionString), max: 5 }) : null
export async function query(text, values = []) {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  return pool.query(text, values)
}
