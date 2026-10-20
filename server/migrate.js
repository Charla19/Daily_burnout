import { readFile } from 'node:fs/promises'
import './env.js'
import pg from 'pg'

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!direct) throw new Error('DATABASE_URL_UNPOOLED is required')
const url = new URL(direct)
url.searchParams.set('sslmode', 'verify-full')
const client = new pg.Client({ connectionString: url.toString() })
await client.connect()
for (const file of ['001_init.sql', '002_code_attempts.sql']) {
  const sql = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8')
  await client.query(sql)
}
console.log('Database migration complete')
await client.end()
