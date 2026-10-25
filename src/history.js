const KEY = 'minicross-history'
const MAX_ENTRIES = 50

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(entries) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES))) } catch {}
}

export function addCreated(hash, label) {
  const entries = load().filter(e => !(e.type === 'created' && e.hash === hash))
  entries.unshift({ type: 'created', hash, label, ts: Date.now() })
  save(entries)
}

export function addSolved(hash, label) {
  const entries = load()
  if (entries.some(e => e.type === 'solved' && e.hash === hash)) return
  entries.unshift({ type: 'solved', hash, label, ts: Date.now() })
  save(entries)
}

export function getHistory() {
  return load()
}
