/**
 * DEMO DATA LAYER — placeholder only.
 * Uses a naive per-pattern indexOf scan purely so the UI has data to render.
 * This is NOT Aho–Corasick. The real algorithm will live in the Java backend.
 */
import Papa from 'papaparse'

let rows = null
let last = null

async function load() {
  if (rows) return rows
  const buf = await (await fetch('/spam.csv')).arrayBuffer()
  const text = new TextDecoder('windows-1252').decode(buf)
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  rows = data.filter((r) => r.v2).map((r, i) => ({ id: i + 1, label: r.v1, text: r.v2 }))
  return rows
}

export async function getDatasetInfo() {
  return { name: 'SMS Spam Collection', count: (await load()).length }
}

export async function buildAutomaton(patterns) {
  const t = performance.now()
  await new Promise((r) => setTimeout(r, 350)) // simulated latency
  const nodeCount = 1 + patterns.reduce((a, p) => a + p.length, 0) // upper bound, demo value
  return { patternCount: patterns.length, nodeCount, buildMs: +(performance.now() - t).toFixed(2) }
}

export async function searchDataset(patterns) {
  const data = await load()
  const t = performance.now()
  const matches = []
  const ids = new Set()
  for (const m of data) {
    const low = m.text.toLowerCase()
    for (const p of patterns) {
      let i = low.indexOf(p)
      while (i !== -1) {
        matches.push({ id: m.id, pattern: p, position: i, message: m.text, label: m.label })
        ids.add(m.id)
        i = low.indexOf(p, i + 1)
      }
    }
  }
  matches.sort((a, b) => a.id - b.id || a.position - b.position)
  const executionMs = +(performance.now() - t).toFixed(2)
  last = { patterns, matches }
  return { patterns, matchedMessages: ids.size, totalOccurrences: matches.length, executionMs, matches }
}

export async function getAnalytics() {
  if (!last) return null
  const { patterns, matches } = last
  const frequency = patterns.map((p) => ({ pattern: p, count: matches.filter((m) => m.pattern === p).length }))
  const spamIds = new Set(matches.filter((m) => m.label === 'spam').map((m) => m.id))
  const allIds = new Set(matches.map((m) => m.id))
  return {
    frequency,
    spamMatches: spamIds.size,
    hamMatches: allIds.size - spamIds.size,
    avgPosition: matches.length ? +(matches.reduce((a, m) => a + m.position, 0) / matches.length).toFixed(1) : 0,
  }
}
