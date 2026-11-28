// Buffer between an iOS Shortcut and LifeOS HealthSync. The phone writes, the Mac drains and acks.
export interface Env {
  BUFFER: {
    put(key: string, value: string, opts: { expirationTtl: number }): Promise<void>
    get(key: string): Promise<string | null>
    list(opts: { limit: number }): Promise<{ keys: { name: string }[] }>
    delete(key: string): Promise<void>
  }
  INGEST_TOKEN: string
  DRAIN_TOKEN: string
}

const TTL = 30 * 24 * 3600
const MAX_BYTES = 16 * 1024

// flat Shortcut key -> metric name HealthSync's normalizer (hae.ts) maps
const METRICS: Record<string, string> = {
  steps: 'Step Count',
  active_energy_kcal: 'Active Energy',
  exercise_minutes: 'Apple Exercise Time',
  resting_hr: 'Resting Heart Rate',
  hrv_ms: 'Heart Rate Variability',
  weight_kg: 'Weight & Body Mass',
  body_fat_pct: 'Body Fat Percentage',
  lean_mass_kg: 'Lean Body Mass',
}

/** Accepts 92.5, "92,5", "92,5 kg", "1.234,5". Empty, junk, zero and negative are "no data". */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null
  if (typeof value !== 'string') return null
  let s = value.trim().match(/^\d[\d.,\s]*/)?.[0].replace(/\s/g, '') ?? ''
  const dot = s.lastIndexOf('.'), comma = s.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (comma >= 0) s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  const n = Number(s)
  return s && Number.isFinite(n) && n > 0 ? n : null
}

export function toEnvelope(flat: Record<string, unknown>, now: string) {
  const date = typeof flat.exported_at === 'string' && !Number.isNaN(Date.parse(flat.exported_at)) ? flat.exported_at : now
  const metrics: { name: string; data: Record<string, unknown>[] }[] = []
  for (const [key, name] of Object.entries(METRICS)) {
    // whole-number metrics: a Dutch "8.421" is eight thousand, not eight
    const raw = flat[key]
    const grouped = (key === 'steps' || key === 'active_energy_kcal') && typeof raw === 'string' && /^\d{1,3}(\.\d{3})+$/.test(raw.trim())
    let qty = toNumber(grouped ? (raw as string).replace(/\./g, '') : raw)
    if (qty === null) continue
    if (key === 'body_fat_pct' && qty <= 1) qty = Math.round(qty * 1000) / 10
    metrics.push({ name, data: [{ date, qty }] })
  }
  const sleep = toNumber(flat.sleep_hours)
  if (sleep !== null && sleep <= 24) metrics.push({ name: 'Sleep Analysis', data: [{ date, totalSleep: sleep }] })
  return { data: { metrics } }
}

async function sameToken(header: string | null, token: string): Promise<boolean> {
  if (!token || !header) return false
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a, b] = await Promise.all([hash(header), hash(`Bearer ${token}`)])
  return a.reduce((diff, x, i) => diff | (x ^ b[i]!), 0) === 0
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

export async function handle(req: Request, env: Env): Promise<Response> {
  const path = new URL(req.url).pathname
  if (req.method !== 'POST' || !['/ingest', '/drain', '/ack'].includes(path)) return json({ error: 'not found' }, 404)
  const token = path === '/ingest' ? env.INGEST_TOKEN : env.DRAIN_TOKEN
  if (!(await sameToken(req.headers.get('authorization'), token))) return json({ error: 'unauthorized' }, 401)

  if (path === '/drain') {
    const { keys } = await env.BUFFER.list({ limit: 100 })
    const payloads = []
    for (const { name } of keys) {
      const value = await env.BUFFER.get(name)
      if (value !== null) payloads.push({ key: name, body: JSON.parse(value) })
    }
    return json({ payloads })
  }

  const text = await req.text()
  if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413)
  let body: any
  try { body = JSON.parse(text) } catch { return json({ error: 'invalid JSON' }, 400) }
  if (!body || typeof body !== 'object') return json({ error: 'expected an object' }, 400)

  if (path === '/ack') {
    const keys: string[] = Array.isArray(body.keys) ? body.keys.filter((k: unknown) => typeof k === 'string').slice(0, 100) : []
    await Promise.all(keys.map((k) => env.BUFFER.delete(k)))
    return json({ deleted: keys.length })
  }

  const now = new Date().toISOString()
  const envelope = toEnvelope(body, now)
  const names = envelope.data.metrics.map((m) => m.name)
  if (names.length === 0) return json({ error: 'no usable values' }, 422)
  await env.BUFFER.put(`${now}-${crypto.randomUUID()}`, JSON.stringify(envelope), { expirationTtl: TTL })
  return json({ stored: names })
}


