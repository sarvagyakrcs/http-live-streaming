import { Hono } from 'hono'
import type { R2Bucket } from '@cloudflare/workers-types'
import { cors } from 'hono/cors'

type Bindings = {
  MY_BUCKET: R2Bucket
}
const app = new Hono<{ Bindings: Bindings }>()
app.use('/*', cors())

// Serve files from R2 bucket
app.get('/*', async (c) => {
  const path = c.req.path.substring(1) // Remove leading slash
  
  if (!path) {
    return c.text('Not Found', 404)
  }

  const object = await c.env.MY_BUCKET.get(path)
  
  if (!object) {
    return c.text('File not found', 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, {
    headers,
  })
})

export default app