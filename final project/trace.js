/**
 * Educational step generator for the VISUALIZER tab only.
 * Records every action of Aho–Corasick on a tiny example so it can be replayed step by step.
 * It is NOT used to search the dataset — dataset search is the job of the Java backend.
 */
export function traceAC(patterns, text) {
  const nodes = [{ id: 0, ch: 'ε', s: '', next: {}, fail: 0, out: [] }]
  const steps = []
  const vis = new Set([0])
  const fl = new Set()
  const matches = []
  const push = (o) => steps.push({ vis: [...vis], fl: [...fl], idx: -1, matches: matches.map((m) => ({ ...m })), ...o })

  // Phase 1 — Trie
  for (const p of patterns) {
    let cur = 0
    push({ ph: 0, active: 0, msg: `Insert "${p}" starting at the root.` })
    for (const ch of p) {
      if (!nodes[cur].next[ch]) {
        const n = { id: nodes.length, ch, s: nodes[cur].s + ch, next: {}, fail: 0, out: [] }
        nodes.push(n); nodes[cur].next[ch] = n.id; vis.add(n.id)
        cur = n.id
        push({ ph: 0, active: cur, msg: `No edge '${ch}' — create node "${n.s}".` })
      } else {
        cur = nodes[cur].next[ch]
        push({ ph: 0, active: cur, msg: `Edge '${ch}' exists — reuse node "${nodes[cur].s}" (shared prefix).` })
      }
    }
    nodes[cur].out.push(p)
    push({ ph: 0, active: cur, msg: `Mark "${nodes[cur].s}" as the end of pattern "${p}".` })
  }

  // Phase 2 — Failure links (BFS)
  const q = []
  for (const v of Object.values(nodes[0].next)) {
    nodes[v].fail = 0; fl.add(v); q.push(v)
    push({ ph: 1, active: v, msg: `Depth-1 node "${nodes[v].s}": failure link → root.`, failTo: 0 })
  }
  while (q.length) {
    const u = q.shift()
    for (const [ch, v] of Object.entries(nodes[u].next)) {
      let f = nodes[u].fail
      while (f !== 0 && !nodes[f].next[ch]) f = nodes[f].fail
      nodes[v].fail = nodes[f].next[ch] ?? 0
      if (nodes[v].fail === v) nodes[v].fail = 0
      const merged = nodes[nodes[v].fail].out
      if (merged.length) nodes[v].out.push(...merged.filter((x) => !nodes[v].out.includes(x)))
      fl.add(v); q.push(v)
      const t = nodes[v].fail
      push({
        ph: 1, active: v, failTo: t,
        msg: `Node "${nodes[v].s}": longest proper suffix that is also a trie prefix is "${nodes[t].s || 'ε'}" → failure link.` +
          (merged.length ? ` Inherits output {${merged.join(', ')}}.` : ''),
      })
    }
  }

  // Phase 3 — Scan
  let cur = 0
  push({ ph: 2, active: 0, msg: 'Start scanning at the root.' })
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    while (cur !== 0 && !nodes[cur].next[c]) {
      const f = nodes[cur].fail
      push({ ph: 2, idx: i, active: cur, failTo: f, msg: `At "${nodes[cur].s}" there is no edge '${c}' → follow failure link to "${nodes[f].s || 'ε'}".` })
      cur = f
    }
    if (nodes[cur].next[c] !== undefined) {
      const from = cur
      cur = nodes[cur].next[c]
      push({ ph: 2, idx: i, active: cur, msg: `δ("${nodes[from].s || 'ε'}", '${c}') → "${nodes[cur].s}".` })
    } else push({ ph: 2, idx: i, active: 0, msg: `No edge '${c}' from the root — stay at root.` })
    if (nodes[cur].out.length) {
      const hit = nodes[cur].out.map((p) => ({ pattern: p, start: i - p.length + 1, end: i }))
      matches.push(...hit)
      push({ ph: 2, idx: i, active: cur, hit,
        msg: `MATCH found at "${nodes[cur].s}": ${hit.map((h) => `"${h.pattern}"`).join(', ')} ending at index ${i}.` })
    }
  }
  push({ ph: 3, active: 0, msg: `Scan complete: ${matches.length} occurrence(s) found in a single pass over the text.` })
  return { nodes, steps }
}

/** Tidy layout: leaves get consecutive x, parents sit above the mean of their children. */
export function layout(nodes) {
  let x = 0
  const pos = {}
  ;(function d(u, y) {
    const ks = Object.values(nodes[u].next)
    if (!ks.length) { pos[u] = { x: x++, y }; return }
    ks.forEach((v) => d(v, y + 1))
    pos[u] = { x: ks.reduce((a, v) => a + pos[v].x, 0) / ks.length, y }
  })(0, 0)
  return pos
}
