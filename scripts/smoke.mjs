import { createHmac } from 'node:crypto'
import { once } from 'node:events'
import { query, pool } from '../server/db.js'

const port = 3112
const externalBase = process.env.SMOKE_BASE_URL
let localServer
if (!externalBase) {
  process.env.PORT = String(port)
  const { startServer } = await import('../server/index.js')
  localServer = startServer(port)
  await once(localServer, 'listening')
}
const base = externalBase ? `${externalBase.replace(/\/$/, '')}/api` : `http://127.0.0.1:${port}/api`
const email = `smoke-${Date.now()}@example.invalid`
const code = '482916'
const digest = createHmac('sha256', process.env.AUTH_CODE_SECRET).update(`${email}:${code}`).digest('hex')
let userId
let failed = false

async function call(path, method = 'GET', data, cookie) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined })
  const result = await response.json()
  if (!response.ok) throw new Error(`${path}: ${response.status} ${result.error}`)
  return { result, response }
}

try {
  await query("INSERT INTO sign_in_links(email,token_hash,expires_at) VALUES($1,$2,now() + interval '15 minutes')", [email, digest])
  const rejected = await fetch(`${base}/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: '000000' }) })
  if (rejected.status !== 400) throw new Error('Wrong code was accepted')
  const verified = await call('/auth/verify', 'POST', { email, code })
  const replay = await fetch(`${base}/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) })
  if (replay.status !== 400) throw new Error('Code replay was accepted')
  const cookie = verified.response.headers.get('set-cookie').split(';')[0]
  userId = verified.result.user.id
  const me = await call('/me', 'GET', null, cookie)
  if (me.result.user.email !== email) throw new Error('Session lookup failed')
  const saved = await call('/checkins', 'POST', { energy: 4, focus: 6, pressure: 8, note: 'Smoke test' }, cookie)
  if (!saved.result.checkin.id) throw new Error('Check-in insert failed')
  const history = await call('/checkins', 'GET', null, cookie)
  if (!history.result.today || history.result.history.length !== 1) throw new Error('Check-in read failed')
  const community = await call('/community', 'GET', null, cookie)
  if (!community.result.challenge?.prompt) throw new Error('Community prompt missing')
  await call('/submissions', 'POST', { response: 'The stapler has quietly taken over.' }, cookie)
  const feed = await call('/community', 'GET', null, cookie)
  const ownEntry = feed.result.entries.find((item) => item.response.includes('stapler'))
  if (!ownEntry) throw new Error('Community submission missing')
  await call(`/submissions/${ownEntry.id}/react`, 'POST', null, cookie)
  const reacted = await call('/community', 'GET', null, cookie)
  const ownReaction = reacted.result.entries.find((item) => item.id === ownEntry.id)
  if (ownReaction.reaction_count !== 1 || !ownReaction.appreciated_by_me) throw new Error('Own reaction was not saved')
  const duplicate = await fetch(`${base}/submissions/${ownEntry.id}/react`, { method: 'POST', headers: { Cookie: cookie } })
  if (duplicate.status !== 409) throw new Error('Duplicate reaction was accepted')
  await call('/auth/logout', 'POST', null, cookie)
  const afterLogout = await fetch(`${base}/me`, { headers: { Cookie: cookie } })
  if (afterLogout.status !== 401) throw new Error('Logout did not invalidate the session')
  console.log('PASS: six-digit code rejection/verification/replay, session, check-in write/read, community write/read, own reaction, duplicate rejection, logout')
} catch (error) {
  failed = true
  console.error(error)
} finally {
  if (userId) await query('DELETE FROM app_users WHERE id=$1', [userId])
  await query('DELETE FROM sign_in_links WHERE email=$1', [email])
  await pool.end()
  if (localServer) localServer.close()
  process.exit(failed ? 1 : 0)
}
