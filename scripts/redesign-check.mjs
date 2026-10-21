import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = 'http://127.0.0.1:5190'
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5190'], { stdio: 'ignore' })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(base)).ok) { ready = true; break } } catch { /* Wait for Vite. */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error('Vite did not start')
  await mkdir('screenshots', { recursive: true })
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox', '--disable-extensions'] })
  const loaderPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await loaderPage.route('**/api/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  })
  await loaderPage.goto(base)
  await loaderPage.getByRole('status').getByText('Finding the unofficial exit...').waitFor()
  if (await loaderPage.getByText('ESCAPING THE INBOX...').count()) throw new Error('Old loader is still rendered')
  await loaderPage.screenshot({ path: 'screenshots/redesign-loader-mobile.png' })
  await loaderPage.close()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(base)
  await page.getByRole('heading', { name: /Clock out/ }).waitFor()
  await page.screenshot({ path: 'screenshots/redesign-entry-desktop.png', fullPage: true })
  await page.getByRole('button', { name: /Need air now/ }).click()
  await page.getByRole('heading', { name: /BE SOMEWHERE/ }).waitFor()
  await page.screenshot({ path: 'screenshots/redesign-escape-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'screenshots/redesign-escape-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Mute escape music' }).click()
  await page.getByRole('button', { name: /Start my escape/ }).click()
  await page.locator('.floating-line').waitFor({ timeoutMs: 8000 })
  await page.screenshot({ path: 'screenshots/redesign-escape-running-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: /Back to the desk/ }).click()
  await page.screenshot({ path: 'screenshots/redesign-entry-mobile.png', fullPage: true })
  const guestOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (guestOverflow > 0) throw new Error(`Guest mobile overflow: ${guestOverflow}px`)

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const data = path.endsWith('/me') ? { user: { id: 7, email: 'guest@example.invalid' } }
      : path.endsWith('/health') ? { ai: true }
        : path.endsWith('/checkins') ? { today: null, history: [] }
          : { challenge: { prompt: 'A stapler declares itself boss.' }, entries: [], artAvailable: true }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.reload()
  await page.getByRole('heading', { name: /THE DESK/ }).waitFor()
  await page.waitForTimeout(1200)
  await page.context().grantPermissions(['notifications'])
  await page.getByRole('button', { name: /Poke me later/ }).click()
  await page.getByRole('button', { name: '45 min' }).click()
  await page.getByText(/Desk nudge at/).waitFor()
  await page.screenshot({ path: 'screenshots/redesign-home-mobile.png', fullPage: true })
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (homeOverflow > 0) throw new Error(`Home mobile overflow: ${homeOverflow}px`)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: 'screenshots/redesign-home-desktop.png', fullPage: true })
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Break room' }).click()
  await page.getByRole('heading', { name: /Community edition/ }).waitFor()
  await page.screenshot({ path: 'screenshots/redesign-community-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'screenshots/redesign-community-mobile.png', fullPage: true })
  const communityOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (communityOverflow > 0) throw new Error(`Community mobile overflow: ${communityOverflow}px`)
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'My days' }).click()
  await page.getByRole('heading', { name: /Proof you were/ }).waitFor()
  await page.screenshot({ path: 'screenshots/redesign-archive-mobile.png', fullPage: true })
  const archiveOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (archiveOverflow > 0) throw new Error(`Archive mobile overflow: ${archiveOverflow}px`)
  console.log('PASS: new loader, guest entry, timed escape line, signed-in home, break room, archive, opt-in nudge, and 390px mobile have no horizontal overflow')
} finally {
  if (browser) await browser.close()
  vite.kill()
}
