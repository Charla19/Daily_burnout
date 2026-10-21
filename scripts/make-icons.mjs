import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const svg = await readFile('public/icon.svg', 'utf8')
const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-sandbox', '--disable-extensions'] })
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent(`<html><head><style>html,body{margin:0;width:100%;height:100%;background:#121525}img{display:block;width:100%;height:100%}</style></head><body><img src="${source}" alt="Daily Burnout"></body></html>`)
    await page.getByRole('img').evaluate((image) => image.decode())
    await page.screenshot({ path: `public/icon-${size}.png` })
    await page.close()
  }
} finally {
  await browser.close()
}
console.log('Created matching 192px and 512px PWA icons')
