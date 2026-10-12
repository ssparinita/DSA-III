/**
 * Aho–Corasick multi-pattern matcher.
 * Works on UTF-16 code units, so any Unicode text (and surrogate pairs / emoji) matches correctly
 * and reported positions are plain JS string indices (same as String.slice).
 */
export class AhoCorasick {
  constructor(patterns) {
    this.patterns = [...new Set(patterns.filter(Boolean))]
    // node arrays: children Map per node, fail link, output list (pattern indices)
    this.next = [new Map()]
    this.fail = [0]
    this.out = [[]]
    this.patterns.forEach((p, idx) => this._insert(p, idx))
    this._buildFailureLinks()
  }
  get nodeCount() { return this.next.length }

  _insert(p, idx) {
    let s = 0
    for (let i = 0; i < p.length; i++) {
      const c = p.charCodeAt(i)
      let t = this.next[s].get(c)
      if (t === undefined) {
        t = this.next.length
        this.next.push(new Map()); this.fail.push(0); this.out.push([])
        this.next[s].set(c, t)
      }
      s = t
    }
    this.out[s].push(idx)
  }

  _buildFailureLinks() {
    const q = []
    for (const t of this.next[0].values()) q.push(t) // depth-1 nodes fail to root
    for (let h = 0; h < q.length; h++) {
      const u = q[h]
      for (const [c, v] of this.next[u]) {
        let f = this.fail[u]
        while (f !== 0 && !this.next[f].has(c)) f = this.fail[f]
        const g = this.next[f].get(c)
        this.fail[v] = g !== undefined && g !== v ? g : 0
        // inherit outputs through the failure link (dictionary suffix)
        if (this.out[this.fail[v]].length) this.out[v] = this.out[v].concat(this.out[this.fail[v]])
        q.push(v)
      }
    }
  }

  /** Single pass over text. Returns [{ pattern, position }] for EVERY occurrence (overlaps included). */
  search(text) {
    const res = []
    let s = 0
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      while (s !== 0 && !this.next[s].has(c)) s = this.fail[s]
      const t = this.next[s].get(c)
      if (t !== undefined) s = t
      const o = this.out[s]
      for (let k = 0; k < o.length; k++) {
        const p = this.patterns[o[k]]
        res.push({ pattern: p, position: i - p.length + 1 })
      }
    }
    return res
  }
}
