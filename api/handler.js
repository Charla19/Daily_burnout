import { route, handleError } from '../server/index.js'

export default async function handler(req, res) {
  const routePath = req.query?.path
  if (typeof routePath !== 'string' || !/^[a-zA-Z0-9/_-]+$/.test(routePath)) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  req.url = `/api/${routePath}`
  try { await route(req, res) } catch (error) { handleError(error, res) }
}
