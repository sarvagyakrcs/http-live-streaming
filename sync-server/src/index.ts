import { Hono } from 'hono'
import type { R2Bucket } from '@cloudflare/workers-types'
import { cors } from 'hono/cors'

type Bindings = {
  MY_BUCKET: R2Bucket
  PORT: string
}
const app = new Hono<{ Bindings: Bindings }>()
app.use('/*', cors())

app.get('/', (c) => {
  const port = c.env.PORT
  return c.text(`Hello Hono! on port ${port}`)
})

export default app
