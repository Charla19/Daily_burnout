import { chromium } from 'playwright-core'
import { once } from 'node:events'

const externalBase = process.env.PWA_BASE_URL
let localServer
if (!externalBase) {
  process.env.PORT = '3119'
  process.env.APP_URL = 'http://127.0.0.1:3119'
  const { startServer } = await import('../server/index.js')
  localServer = startServer(3119)
  await once(localServer, 'listening')
}
const base = externalBase?.replace(/\/$/, '') || 'http://127.0.0.1:3119'
let browser
let failed = false
try {
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox', '--disable-extensions'] })
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  const page = await context.newPage()
  await page.goto(base)
  await page.getByRole('heading', { name: /Clock out/ }).waitFor()
  const manifestResponse = await page.request.get(`${base}/manifest.webmanifest`)
  const manifest = await manifestResponse.json()
  if (manifest.display !== 'standalone' || manifest.icons.length < 2) throw new Error('PWA manifest is incomplete')
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker did not become ready')), 8000))]))
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('heading', { name: /Clock out/ }).waitFor()
  const mascot = page.getByRole('img', { name: /little red escapee/ })
  await mascot.waitFor()
  if (!await mascot.evaluate((image) => image.complete && image.naturalWidth > 0)) throw new Error('Escapee art is missing offline')
  console.log('PASS: standalone manifest, service worker registration, offline app shell and artwork')
} catch (error) {
  failed = true
  console.error(error)
} finally {
  if (browser) await browser.close()
  if (localServer) localServer.close()
  process.exit(failed ? 1 : 0)
}
