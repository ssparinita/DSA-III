// Zero-framework backend: real Aho–Corasick over the SMS Spam dataset.  Run: npm run server  (port 8080)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'
import { AhoCorasick } from './ahoCorasick.js'
import { extractText } from './extract.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV = path.join(__dirname, '..', 'public', 'spam.csv')
process.on('unhandledRejection', (e) => console.error('unhandled:', e?.message || e))
process.on('uncaughtException', (e) => console.error('uncaught:', e?.message || e))
const PORT = process.env.PORT || 8080

// ---- dataset ----
function loadDataset() {
  const buf = fs.readFileSync(CSV)
  // the Kaggle spam.csv is windows-1252; fall back to UTF-8 if it actually is valid UTF-8 (multilingual datasets)
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { text = new TextDecoder('windows-1252').decode(buf) }
  const { data } = Papa.parse(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true })
  return data.filter((r) => r.v2).map((r, i) => ({ id: i + 1, label: r.v1, text: r.v2 }))
}
const rows = loadDataset()
console.log(`Loaded ${rows.length} messages from spam.csv`)

// ---- uploaded documents (kept in memory; each non-empty line becomes a searchable unit) ----
let docs = [], docSeq = 1
const docUnits = () => docs.flatMap((d) => d.lines.map((l) => ({ id: l.n, label: 'doc', text: l.text, file: d.name })))
const corpus = (source) => (source === 'docs' ? docUnits() : source === 'both' ? [...rows, ...docUnits()] : rows)

// case folding that never changes string length, so positions stay valid for the original text
const fold = (s) => { const l = s.toLowerCase(); if (l.length === s.length) return l; let o = ''; for (const ch of s) { const x = ch.toLowerCase(); o += x.length === ch.length ? x : ch } return o }
const WORD = /[\p{L}\p{N}_]/u
const isWordAt = (s, i, back) => {
  if (i < 0 || i >= s.length) return false
  let ch = s[i]
  if (back && /[\udc00-\udfff]/.test(ch) && i > 0) ch = s[i - 1] + ch
  else if (!back && /[\ud800-\udbff]/.test(ch) && i + 1 < s.length) ch = ch + s[i + 1]
  return WORD.test(ch)
}

// ---- state ----
let automaton = null, autoKey = '', last = null
const norm = (patterns, o) => [...new Set((patterns || []).map((p) => String(p).trim()).filter(Boolean).map((p) => (o.caseSensitive ? p : fold(p))))]
function getAutomaton(patterns, o) {
  const pats = norm(patterns, o)
  const key = JSON.stringify([pats, !!o.caseSensitive])
  if (key !== autoKey || !automaton) {
    const t = performance.now()
    automaton = new AhoCorasick(pats); autoKey = key
    automaton.buildMs = +(performance.now() - t).toFixed(3)
  }
  return automaton
}

function search(patterns, o) {
  const ac = getAutomaton(patterns, o)
  const data = corpus(o.source)
  const t = performance.now()
  const matches = [], ids = new Set()
  for (const m of data) {
    const hay = o.caseSensitive ? m.text : fold(m.text)
    for (const h of ac.search(hay)) {
      if (o.wholeWord && (isWordAt(hay, h.position - 1, true) || isWordAt(hay, h.position + h.pattern.length, false))) continue
      matches.push({ id: m.id, pattern: h.pattern, position: h.position, message: m.text, label: m.label, file: m.file })
      ids.add((m.file || '') + '#' + m.id)
    }
  }
  const order = new Map(docs.map((d, i) => [d.name, i + 1])) // dataset first, then docs in upload order
  matches.sort((a, b) => (order.get(a.file) || 0) - (order.get(b.file) || 0) || a.id - b.id || a.position - b.position)
  const executionMs = +(performance.now() - t).toFixed(2)
  // naive baseline (indexOf per pattern) purely for the speed comparison shown in the UI
  const t2 = performance.now()
  for (const m of data) { const hay = o.caseSensitive ? m.text : fold(m.text); for (const p of ac.patterns) { let i = hay.indexOf(p); while (i !== -1) i = hay.indexOf(p, i + 1) } }
  const naiveMs = +(performance.now() - t2).toFixed(2)
  last = { patterns: ac.patterns, matches, source: o.source || 'dataset' }
  return { patterns: ac.patterns, matchedMessages: ids.size, totalOccurrences: matches.length, executionMs, naiveMs, source: last.source, scanned: data.length, matches }
}

function analytics() {
  if (!last) return null
  const { patterns, matches } = last
  const cnt = new Map(patterns.map((p) => [p, 0]))
  const spam = new Set(), all = new Set(), perFile = new Map()
  let sum = 0
  for (const m of matches) { cnt.set(m.pattern, cnt.get(m.pattern) + 1); const k = (m.file || '') + '#' + m.id; all.add(k); if (m.label === 'spam') spam.add(k); sum += m.position; if (m.file) perFile.set(m.file, (perFile.get(m.file) || 0) + 1) }
  return {
    frequency: patterns.map((p) => ({ pattern: p, count: cnt.get(p) })),
    spamMatches: spam.size, hamMatches: all.size - spam.size,
    avgPosition: matches.length ? +(sum / matches.length).toFixed(1) : 0,
    perFile: [...perFile].map(([file, count]) => ({ file, count })),
  }
}

// ---- http ----
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-OCR-Lang', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' }); res.end(JSON.stringify(obj)) }
const readRaw = (req, max = 60e6) => new Promise((ok, no) => { const c = []; let n = 0; req.on('data', (d) => { n += d.length; if (n > max) { no(new Error('File too large (60 MB max)')); req.destroy() } else c.push(d) }); req.on('end', () => ok(Buffer.concat(c))) })
const readBody = (req) => new Promise((ok, no) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}) } catch (e) { no(e) } }) })

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  try {
    const url = req.url.split('?')[0]
    if (req.method === 'GET' && url === '/api/dataset') return send(res, 200, { name: 'SMS Spam Collection', count: rows.length })
    if (req.method === 'GET' && url === '/api/analytics') return send(res, 200, analytics())
    if (req.method === 'POST' && url === '/api/automaton/build') {
      const { patterns, options = {} } = await readBody(req)
      const ac = getAutomaton(patterns, options)
      return send(res, 200, { patternCount: ac.patterns.length, nodeCount: ac.nodeCount, buildMs: ac.buildMs })
    }
    if (req.method === 'POST' && url === '/api/search') {
      const { patterns, options = {} } = await readBody(req)
      if (!Array.isArray(patterns) || !patterns.length) return send(res, 400, { error: 'patterns required' })
      return send(res, 200, search(patterns, options))
    }
    if (req.method === 'GET' && url === '/api/documents') return send(res, 200, docs.map(({ lines, ...d }) => d))
    if (req.method === 'POST' && url === '/api/documents') {
      const name = decodeURIComponent(req.headers['x-filename'] || 'upload.txt')
      const lang = (req.headers['x-ocr-lang'] || 'eng').replace(/[^a-z_+]/gi, '')
      const buf = await readRaw(req)
      const { type, text } = await extractText(buf, name, lang)
      const lines = []
      text.split(/\r?\n/).forEach((t, i) => { if (t.trim()) lines.push({ n: i + 1, text: t }) })
      if (!lines.length) return send(res, 422, { error: 'No readable text found in ' + name })
      docs = docs.filter((d) => d.name !== name) // re-upload replaces
      const doc = { id: docSeq++, name, type, chars: text.length, lineCount: lines.length, lines }
      docs.push(doc)
      const { lines: _l, ...info } = doc
      return send(res, 200, info)
    }
    if (req.method === 'DELETE' && url.startsWith('/api/documents/')) { const id = +url.split('/').pop(); docs = docs.filter((d) => d.id !== id); return send(res, 200, { ok: true }) }
    send(res, 404, { error: 'not found' })
  } catch (e) { send(res, 500, { error: e.message }) }
}).listen(PORT, () => console.log(`Aho–Corasick API on http://localhost:${PORT}`))
