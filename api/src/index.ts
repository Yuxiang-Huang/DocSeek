import { Hono } from 'hono'

export const app = new Hono()
const port = Number(process.env.PORT ?? 3000)

app.get('/', (c) => {
  return c.json({
    name: 'DocSeek API',
    status: 'ok',
    port,
  })
})

export default {
  port,
  fetch: app.fetch,
}
