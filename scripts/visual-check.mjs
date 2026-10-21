import { createHmac } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { query, pool } from '../server/db.js'

process.env.PORT = '3118'
process.env.APP_URL = 'http://127.0.0.1:5178'
const { startServer } = await import('../server/index.js')
const apiServer = startServer(3118)
const base = 'http://127.0.0.1:5178'
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178'], { env: { ...process.env, API_PORT: '3118' }, stdio: 'ignore' })
const email = `visual-${Date.now()}@example.invalid`
const code = '621481'
const digest = createHmac('sha256', process.env.AUTH_CODE_SECRET).update(`${email}:${code}`).digest('hex')
let browser
let userId
let failed = false

try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const result = await fetch(base); if (result.ok) { ready = true; break } } catch { /* waiting for Vite */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error('Vite did not start')
  await mkdir('screenshots', { recursive: true })
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox', '--disable-extensions'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(base)
  await page.getByRole('heading', { name: /Clock out/ }).waitFor()
  await page.screenshot({ path: 'screenshots/sign-in-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'light') throw new Error('Light mode did not activate')
  await page.screenshot({ path: 'screenshots/sign-in-light-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'screenshots/sign-in-light-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await page.screenshot({ path: 'screenshots/sign-in-mobile.png', fullPage: true })
  const loginWidth = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
  if (loginWidth.content > loginWidth.viewport) throw new Error(`Mobile sign-in overflows: ${JSON.stringify(loginWidth)}`)
  await page.setViewportSize({ width: 375, height: 812 })
  const smallWidth = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
  if (smallWidth.content > smallWidth.viewport) throw new Error(`Small phone sign-in overflows: ${JSON.stringify(smallWidth)}`)
  await page.setViewportSize({ width: 390, height: 844 })

  await query("INSERT INTO sign_in_links(email,token_hash,expires_at) VALUES($1,$2,now() + interval '10 minutes')", [email, digest])
  const verified = await context.request.post(`${base}/api/auth/verify`, { data: { email, code } })
  if (!verified.ok()) throw new Error(`Browser authentication failed: ${verified.status()}`)
  userId = (await verified.json()).user.id
  await page.reload()
  await page.getByRole('heading', { name: /OFF DUTY/ }).waitFor()
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'screenshots/check-in-light-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'screenshots/check-in-mobile.png', fullPage: true })
  const appWidth = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
  if (appWidth.content > appWidth.viewport) throw new Error(`Mobile app overflows: ${JSON.stringify(appWidth)}`)
  await page.getByRole('button', { name: /Predict my extremely fake crash/ }).click()
  await page.getByRole('heading', { name: /The daily receipt/i }).waitFor().catch(async () => page.locator('.field-note h2').waitFor())
  await page.screenshot({ path: 'screenshots/reset-mobile.png', fullPage: true })
  console.log(`PASS: desktop and mobile render, no mobile overflow, authenticated check-in and reset (${loginWidth.viewport}px viewport)`)
} catch (error) {
  failed = true
  console.error(error)
} finally {
  if (browser) await browser.close()
  vite.kill()
  apiServer.close()
  if (userId) await query('DELETE FROM app_users WHERE id=$1', [userId])
  await query('DELETE FROM sign_in_links WHERE email=$1', [email])
  await pool.end()
  process.exit(failed ? 1 : 0)
}
