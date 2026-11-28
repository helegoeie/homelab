import { handle, type Env } from './worker.ts'
import { fileBuffer } from './store.ts'

const { INGEST_TOKEN = '', DRAIN_TOKEN = '', DATA_DIR = '/data', PORT = '3000' } = process.env
if (!INGEST_TOKEN || !DRAIN_TOKEN) throw new Error('INGEST_TOKEN and DRAIN_TOKEN are required')
const env: Env = { BUFFER: fileBuffer(`${DATA_DIR}/buffer`), INGEST_TOKEN, DRAIN_TOKEN }

Bun.serve({
  port: Number(PORT),
  maxRequestBodySize: 64 * 1024,
  fetch: (req) => (new URL(req.url).pathname === '/health' ? new Response('ok') : handle(req, env)),
})
console.log(`health-ingest on :${PORT}`)
