/**
 * API SERVICE LAYER — the only file the UI talks to.
 *
 * Today:  mock mode -> responses come from ./mock.js (plain demo data, NOT Aho–Corasick).
 * Later:  set VITE_USE_MOCK=false (see .env.example) and the same functions call the Java backend,
 *         which runs the real algorithm.
 *
 * Expected Java endpoints (JSON):
 *   GET  /api/dataset            -> { name, count }
 *   POST /api/automaton/build    body { patterns:[..] } -> { patternCount, nodeCount, buildMs }
 *   POST /api/search             body { patterns:[..] } -> { patterns, matchedMessages, totalOccurrences, executionMs,
 *                                    matches:[{ id, pattern, position, message, label }] }
 *   GET  /api/analytics          -> { frequency:[{pattern,count}], spamMatches, hamMatches, avgPosition }
 */
import * as mock from './mock.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BASE = import.meta.env.VITE_API_URL || '' // '' + Vite proxy -> http://localhost:8080

async function http(path, body) {
  const res = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export const isMock = USE_MOCK
export const getDatasetInfo = () => (USE_MOCK ? mock.getDatasetInfo() : http('/api/dataset'))
export const buildAutomaton = (patterns, options = {}) => (USE_MOCK ? mock.buildAutomaton(patterns) : http('/api/automaton/build', { patterns, options }))
export const searchDataset = (patterns, options = {}) => (USE_MOCK ? mock.searchDataset(patterns) : http('/api/search', { patterns, options }))
export const getAnalytics = () => (USE_MOCK ? mock.getAnalytics() : http('/api/analytics'))

// ---- documents (backend only) ----
export const getDocuments = () => (USE_MOCK ? Promise.resolve([]) : http('/api/documents'))
export const deleteDocument = (id) => fetch(BASE + '/api/documents/' + id, { method: 'DELETE' }).then((r) => r.json())
export async function uploadDocument(file, lang = 'eng') {
  const res = await fetch(BASE + '/api/documents', {
    method: 'POST',
    headers: { 'X-Filename': encodeURIComponent(file.name), 'X-OCR-Lang': lang },
    body: file,
  })
  const j = await res.json()
  if (!res.ok) throw new Error(j.error || 'Upload failed')
  return j
}
