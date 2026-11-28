// Files-on-a-volume version of the buffer the handler needs. One payload per file.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import type { Env } from './worker.ts'

// keys are minted by the handler (ISO time + uuid); anything else never touches the disk
const KEY = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z-[0-9a-f-]{36}$/
const MAX_FILES = 500

export function fileBuffer(dir: string, now = () => Date.now()): Env['BUFFER'] {
  mkdirSync(dir, { recursive: true })
  const names = () => readdirSync(dir).filter((n) => KEY.test(n)).sort()
  return {
    async put(key, value, { expirationTtl }) {
      if (!KEY.test(key)) throw new Error('bad key')
      writeFileSync(join(dir, `${key}.tmp`), value, { mode: 0o600 })
      renameSync(join(dir, `${key}.tmp`), join(dir, key))
      for (const n of names()) if (now() - statSync(join(dir, n)).mtimeMs > expirationTtl * 1000) rmSync(join(dir, n))
      for (const n of names().slice(0, -MAX_FILES)) rmSync(join(dir, n))
    },
    async get(key) {
      if (!KEY.test(key)) return null
      try { return readFileSync(join(dir, key), 'utf8') } catch { return null }
    },
    async list({ limit }) { return { keys: names().slice(0, limit).map((name) => ({ name })) } },
    async delete(key) { if (KEY.test(key)) rmSync(join(dir, key), { force: true }) },
  }
}
