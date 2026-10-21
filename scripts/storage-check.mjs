import { randomUUID } from 'node:crypto'
import { deleteImage, imageUrl, saveImage, storageReady } from '../server/storage.js'

if (!storageReady) throw new Error('Neon object storage is not configured')
const key = `checks/${randomUUID()}.png`
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVRsAAAAASUVORK5CYII=', 'base64')
try {
  await saveImage(key, { bytes, contentType: 'image/png' })
  const url = await imageUrl(key)
  const response = await fetch(url)
  if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('Signed image read failed')
  console.log('PASS: private Neon object upload, signed read, byte-for-byte match')
} finally {
  await deleteImage(key)
}
