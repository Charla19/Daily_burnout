import http from 'node:http'
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, query } from './db.js'

const port = Number(process.env.PORT || 3101)
const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173')
const resendKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL
const codeSecret = process.env.AUTH_CODE_SECRET
const cookieSecure = new URL(appUrl).protocol === 'https:'
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const token = () => randomBytes(32).toString('base64url')
const codeHash = (email, code) => createHmac('sha256', codeSecret).update(`${email}:${code}`).digest('hex')
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const prompts = [
  'If your inbox were a fictional character, what would its villain origin story be?',
  'What very small task deserves a very large award today?',
  'Give your most useless meeting a much more honest title.',
  'If your desk could ask for one day off, where would it go?',
  'What would your out-of-office message say if it told the whole truth?',
  'Invent a new office holiday that everyone would actually celebrate.',
  'Which everyday object is secretly running the workplace? Make your case.',
]
const resets = {
  hard: ['You do not have to earn a pause.', 'Today seems heavy. Take one thing off the list if you can. A slower pace is still a pace, and your worth was never a measure of your output.'],
  steady: ['Enough is a complete sentence.', 'You are carrying a normal human amount of energy into a day that may be asking for more. Pick the next useful step, then let that be enough for now.'],
  good: ['Keep some of this for yourself.', 'There is room to feel good about today without filling every open minute. Notice what is working and protect a little of that energy for later.'],
}
function resetFor({ energy, focus, pressure }) { const key = pressure >= 8 || energy <= 3 ? 'hard' : energy >= 7 && focus >= 6 && pressure <= 5 ? 'good' : 'steady'; return resets[key] }
function json(res, status, value, extra = {}) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }); res.end(JSON.stringify(value)) }
async function body(req) { if (req.body !== undefined) return req.body; let raw = ''; for await (const part of req) { raw += part; if (raw.length > 10000) throw new Error('Request too large') } return raw ? JSON.parse(raw) : {} }
function cookie(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key, value]) => key && value)) }
async function userFrom(req) { const session = cookie(req).db_session; if (!session) return null; const result = await query('SELECT u.id, u.email FROM sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()', [hash(session)]); return result.rows[0] || null }
function requireUser(user, res) { if (user) return true; json(res, 401, { error: 'Please sign in to continue.' }); return false }
function originAllowed(req) { const origin = req.headers.origin; return !origin || origin === `https://${req.headers.host}` || origin === new URL(appUrl).origin }
async function sendCode(email, code) {
  if (!resendKey || !fromEmail) throw new Error('Resend is not configured')
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromEmail, to: [email], subject: 'Your Daily Burnout verification code', html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;color:#181818"><h1>Sign in to Daily Burnout</h1><p>Enter this one-time code in the app. It expires in 10 minutes.</p><p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#d43732">${code}</p><p>If you did not request this, you can ignore this email.</p></div>`, text: `Your Daily Burnout sign-in code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` }) })
  if (!response.ok) throw new Error(`Resend rejected the email (${response.status})`)
}
export async function route(req, res) {
  const url = new URL(req.url, appUrl)
  const method = req.method
  if (url.pathname === '/api/health') { json(res, 200, { ok: true, database: Boolean(pool), resend: Boolean(resendKey && fromEmail), auth: Boolean(codeSecret) }); return }
  if (!url.pathname.startsWith('/api/')) return serveStatic(url.pathname, res)
  if (method !== 'GET' && !originAllowed(req)) { json(res, 403, { error: 'Origin is not allowed.' }); return }
  if (method === 'POST' && url.pathname === '/api/auth/request') {
    const { email } = await body(req)
    const normalized = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) { json(res, 400, { error: 'Enter a valid email address.' }); return }
    const recent = await query("SELECT count(*)::int AS count FROM sign_in_links WHERE email=$1 AND created_at > now() - interval '1 hour'", [normalized])
    if (recent.rows[0].count >= 5) { json(res, 429, { error: 'Too many requests. Try again in an hour.' }); return }
    if (!codeSecret) throw new Error('AUTH_CODE_SECRET is not configured')
    const code = String(randomInt(0, 1000000)).padStart(6, '0')
    const digest = codeHash(normalized, code)
    await query('UPDATE sign_in_links SET used_at=now() WHERE email=$1 AND used_at IS NULL', [normalized])
    await query("INSERT INTO sign_in_links(email, token_hash, expires_at) VALUES($1,$2,now() + interval '10 minutes')", [normalized, digest])
    try { await sendCode(normalized, code) }
    catch (error) { await query('DELETE FROM sign_in_links WHERE token_hash=$1', [digest]); throw error }
    json(res, 200, { ok: true }); return
  }
  if (method === 'POST' && url.pathname === '/api/auth/verify') {
    const { email, code } = await body(req)
    const normalized = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !/^[0-9]{6}$/.test(code || '')) { json(res, 400, { error: 'Enter the six-digit code from your email.' }); return }
    if (!codeSecret) throw new Error('AUTH_CODE_SECRET is not configured')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const link = await client.query('SELECT id, token_hash, attempts FROM sign_in_links WHERE email=$1 AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [normalized])
      if (!link.rowCount || link.rows[0].attempts >= 5) { await client.query('ROLLBACK'); json(res, 400, { error: 'The code has expired. Request a new one.' }); return }
      const expected = Buffer.from(link.rows[0].token_hash, 'hex')
      const actual = Buffer.from(codeHash(normalized, code), 'hex')
      if (!timingSafeEqual(expected, actual)) { await client.query('UPDATE sign_in_links SET attempts=attempts+1 WHERE id=$1', [link.rows[0].id]); await client.query('COMMIT'); json(res, 400, { error: 'Incorrect code. Please try again.' }); return }
      await client.query('UPDATE sign_in_links SET used_at=now() WHERE id=$1', [link.rows[0].id])
      const user = await client.query('INSERT INTO app_users(email) VALUES($1) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,email', [normalized])
      const session = token()
      await client.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now() + interval '30 days')", [user.rows[0].id, hash(session)])
      await client.query('COMMIT')
      json(res, 200, { user: user.rows[0] }, { 'Set-Cookie': `db_session=${encodeURIComponent(session)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${cookieSecure ? '; Secure' : ''}` })
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    return
  }
  const user = await userFrom(req)
  if (method === 'GET' && url.pathname === '/api/me') { if (requireUser(user, res)) json(res, 200, { user }); return }
  if (method === 'POST' && url.pathname === '/api/auth/logout') { const value = cookie(req).db_session; if (value) await query('DELETE FROM sessions WHERE token_hash=$1', [hash(value)]); json(res, 200, { ok: true }, { 'Set-Cookie': `db_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${cookieSecure ? '; Secure' : ''}` }); return }
  if (!requireUser(user, res)) return
  if (method === 'GET' && url.pathname === '/api/checkins') { const rows = await query('SELECT id,user_id,local_date::text AS local_date,energy,focus,pressure,note,reset_title,reset_message,created_at FROM checkins WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [user.id]); json(res, 200, { today: rows.rows.find((row) => row.local_date === day()) || null, history: rows.rows }); return }
  if (method === 'POST' && url.pathname === '/api/checkins') {
    const data = await body(req)
    const nums = ['energy', 'focus', 'pressure'].map((key) => Number(data[key]))
    if (nums.some((value) => !Number.isInteger(value) || value < 1 || value > 10) || typeof data.note !== 'string' || data.note.length > 500) { json(res, 400, { error: 'Please check your answers.' }); return }
    const [title, message] = resetFor(data)
    const result = await query('INSERT INTO checkins(user_id,local_date,energy,focus,pressure,note,reset_title,reset_message) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,local_date) DO NOTHING RETURNING id,user_id,local_date::text AS local_date,energy,focus,pressure,note,reset_title,reset_message,created_at', [user.id, day(), ...nums, data.note.trim(), title, message])
    if (!result.rowCount) { json(res, 409, { error: 'You already checked in today.' }); return }
    json(res, 201, { checkin: result.rows[0] }); return
  }
  if (method === 'GET' && url.pathname === '/api/community') {
    const today = day(); const ordinal = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000)
    const rows = await query("SELECT s.id,s.response,s.created_at,'Member ' || u.id AS author_name,count(r.user_id)::int AS reaction_count,COALESCE(bool_or(r.user_id=$2),false) AS appreciated_by_me FROM submissions s JOIN app_users u ON u.id=s.user_id LEFT JOIN reactions r ON r.submission_id=s.id WHERE s.challenge_date=$1 GROUP BY s.id,u.id ORDER BY reaction_count DESC,s.created_at ASC LIMIT 100", [today, user.id])
    json(res, 200, { challenge: { date: today, prompt: prompts[ordinal % prompts.length] }, entries: rows.rows }); return
  }
  if (method === 'POST' && url.pathname === '/api/submissions') { const data = await body(req); if (typeof data.response !== 'string' || data.response.trim().length < 2 || data.response.length > 400) { json(res, 400, { error: 'Write an answer between 2 and 400 characters.' }); return } const result = await query('INSERT INTO submissions(user_id,challenge_date,response) VALUES($1,$2,$3) ON CONFLICT(user_id,challenge_date) DO NOTHING RETURNING id', [user.id, day(), data.response.trim()]); if (!result.rowCount) { json(res, 409, { error: 'You already answered today’s prompt.' }); return } json(res, 201, { ok: true }); return }
  const reaction = url.pathname.match(/^\/api\/submissions\/(\d+)\/react$/)
  if (method === 'POST' && reaction) { const result = await query('INSERT INTO reactions(user_id,submission_id) SELECT $1,id FROM submissions WHERE id=$2 AND challenge_date=$3 ON CONFLICT DO NOTHING RETURNING user_id', [user.id, Number(reaction[1]), day()]); if (!result.rowCount) { json(res, 409, { error: 'You already appreciated this answer.' }); return } json(res, 200, { ok: true }); return }
  json(res, 404, { error: 'Not found.' })
}
async function serveStatic(requestPath, res) {
  const safe = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.(\/|\\|$))+/, '')
  let target = path.resolve(dist, `.${safe}`)
  if (!target.startsWith(dist)) { res.writeHead(403); res.end(); return }
  try { if (!(await stat(target)).isFile()) target = path.join(dist, 'index.html') } catch { target = path.join(dist, 'index.html') }
  try { const file = await readFile(target); const extension = path.extname(target); res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' })[extension] || 'application/octet-stream' }); res.end(file) } catch { res.writeHead(404); res.end('Not found') }
}
export function handleError(error, res) { console.error(error); if (!res.headersSent) json(res, 500, { error: 'Server error. Please try again.' }) }
export function startServer(listenPort = port) { return http.createServer((req, res) => route(req, res).catch((error) => handleError(error, res))).listen(listenPort, () => console.log(`Daily Burnout API listening on ${listenPort}`)) }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer()
}
