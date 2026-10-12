import { useMemo, useState } from 'react'
import { exportCsv } from '../lib/exportCsv'
export default function MessageTable({ rows, limit = 100, filterable = false }) {
  const [q, setQ] = useState(''), [pat, setPat] = useState('all'), [lab, setLab] = useState('all'), [n, setN] = useState(limit)
  const pats = useMemo(() => [...new Set(rows.map((r) => r.pattern))], [rows])
  const f = useMemo(() => rows.filter((r) => (pat === 'all' || r.pattern === pat) && (lab === 'all' || r.label === lab) &&
    (!q || r.message.toLowerCase().includes(q.toLowerCase()) || String(r.id) === q.trim())), [rows, q, pat, lab])
  const hl = (r) => {
    const p = r.position, l = r.pattern.length, m = r.message
    return <>{m.slice(Math.max(0, p - 40), p)}<mark>{m.slice(p, p + l)}</mark>{m.slice(p + l, p + l + 90)}</>
  }
  return (
    <div>
      {filterable && (
        <div className="filters">
          <input placeholder="Filter by text or message ID…" value={q} onChange={(e) => { setQ(e.target.value); setN(limit) }} />
          <select value={pat} onChange={(e) => setPat(e.target.value)}><option value="all">All patterns</option>{pats.map((p) => <option key={p}>{p}</option>)}</select>
          <select value={lab} onChange={(e) => setLab(e.target.value)}><option value="all">Spam and ham</option><option>spam</option><option>ham</option></select>
          <span className="muted">{f.length.toLocaleString()} rows</span>
          <button className="btn ghost" onClick={() => exportCsv(f)} disabled={!f.length}>Export CSV</button>
        </div>
      )}
      <div className="scroll"><table>
        <thead><tr><th>Message ID / File</th><th>Matched pattern</th><th>Position</th><th>Message</th></tr></thead>
        <tbody>
          {f.slice(0, n).map((r, k) => (
            <tr key={k}><td className="mono">{r.file ? <>{r.file}<br /><small className="muted">line {r.id}</small></> : '#' + r.id}</td><td><span className={'tag ' + r.label}>{r.pattern}</span></td><td className="mono">{r.position}</td><td className="msgcell">{hl(r)}</td></tr>
          ))}
          {!f.length && <tr><td colSpan="4" className="muted pad">No matches to show. Run a search first.</td></tr>}
        </tbody>
      </table></div>
      {f.length > n && <button className="btn ghost more" onClick={() => setN(n + limit)}>Show more ({f.length - n} left)</button>}
    </div>
  )
}
