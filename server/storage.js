import './env.js'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const bucket = 'daily-art'
export const storageReady = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_REGION)
const client = storageReady ? new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  forcePathStyle: true,
}) : null

export async function saveImage(key, image) {
  if (!client) throw new Error('Image storage is not configured')
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: image.bytes, ContentType: image.contentType, CacheControl: 'private, max-age=900' }))
  return key
}

export async function imageUrl(key) {
  if (!key || !client) return null
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 })
}

export async function deleteImage(key) {
  if (key && client) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
