import { useMemo, useState } from 'react'
import { traceAC, layout } from '../lib/trace'

const PHASES = ['Trie construction', 'Failure links', 'Text scanning', 'Matches']
const X = 74, Y = 78, PAD = 46

export function Head({ title, sub }) {
  return <header className="head"><h2>{title}</h2><p>{sub}</p></header>
}

export default function Visualizer() {
  const [pt, setPt] = useState('he, she, his, hers')
  const [text, setText] = useState('ahishers')
  const [i, setI] = useState(-1)
  const pats = useMemo(() => [...new Set(pt.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))], [pt])
  const t = text.toLowerCase()
  const { nodes, steps } = useMemo(() => traceAC(pats, t), [pats, t])
  const pos = useMemo(() => layout(nodes), [nodes])
  const s = i >= 0 ? steps[i] : null
  const vis = new Set(s ? s.vis : [0])
  const px = (id) => PAD + pos[id].x * X, py = (id) => PAD + pos[id].y * Y
  const W = PAD * 2 + Math.max(...Object.values(pos).map((p) => p.x), 0) * X
  const H = PAD * 2 + Math.max(...Object.values(pos).map((p) => p.y), 0) * Y
  const edit = (fn) => (e) => { fn(e.target.value); setI(-1) }
  const hitSpan = s?.hit || []
  const shown = s ? s.matches : []
  const edges = []
  nodes.forEach((n) => Object.entries(n.next).forEach(([ch, v]) => vis.has(v) && edges.push([n.id, v, ch])))

  return (
    <section>
      <Head title="Algorithm Visualizer" sub="Step through Aho–Corasick on a small example: build the trie, add failure links, scan the text." />
      <div className="note">This teaching trace is generated in the browser for the small example only. Dataset searching is handled by the Java backend.</div>

      <div className="glass row inputs">
        <label>Patterns<input value={pt} onChange={edit(setPt)} spellCheck="false" /></label>
        <label>Text<input value={text} onChange={edit(setText)} spellCheck="false" /></label>
      </div>

      <div className="glass controls">
        <div className="phases">
          {PHASES.map((p, k) => (
            <div key={p} className={'phase' + (s?.ph === k ? ' on' : s && s.ph > k ? ' done' : '')}>
              <b>{k + 1}</b><span>{p}</span>
            </div>
          ))}
        </div>
        <div className="btns">
          <button className="btn primary" onClick={() => setI(0)} disabled={!steps.length}>Start</button>
          <button className="btn" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i <= 0}>Previous</button>
          <button className="btn primary" onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))} disabled={i < 0 || i >= steps.length - 1}>Next Step</button>
          <button className="btn ghost" onClick={() => setI(-1)}>Reset</button>
          <span className="count mono">{i < 0 ? 'not started' : `step ${i + 1} / ${steps.length}`}</span>
        </div>
      </div>

      <div className="viz-grid">
        <div className="glass trie">
          <h3>Trie and failure links</h3>
          {!s && <p className="muted pad">Press <b>Start</b>. The trie is built one node at a time.</p>}
          <div className="scroll">
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <defs><marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#f5b544" /></marker></defs>
              {edges.map(([a, b, ch]) => (
                <g key={a + '-' + b}>
                  <line x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} className={'edge' + (s?.active === b && s.ph === 0 ? ' hot' : '')} />
                  <text x={(px(a) + px(b)) / 2 - 10} y={(py(a) + py(b)) / 2} className="elabel">{ch}</text>
                </g>
              ))}
              {s && s.ph >= 1 && s.fl.map((n) => {
                const f = nodes[n].fail, a = [px(n), py(n)], b = [px(f), py(f)]
                const mx = (a[0] + b[0]) / 2 + 34, my = (a[1] + b[1]) / 2
                const hot = s.ph === 1 && s.active === n
                return <path key={'f' + n} d={`M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`} className={'fail' + (hot ? ' hot' : '')} markerEnd="url(#ar)" />
              })}
              {s?.ph === 2 && s.failTo !== undefined && (
                <path d={`M${px(s.active)} ${py(s.active)} Q${(px(s.active) + px(s.failTo)) / 2 + 34} ${(py(s.active) + py(s.failTo)) / 2} ${px(s.failTo)} ${py(s.failTo)}`} className="fail hot" markerEnd="url(#ar)" />
              )}
              {nodes.filter((n) => vis.has(n.id)).map((n) => (
                <g key={n.id} className={'node' + (s?.active === n.id ? ' active' : '') + (hitSpan.length && s.active === n.id ? ' hit' : '')}>
                  {pats.includes(n.s) && <circle cx={px(n.id)} cy={py(n.id)} r="24" className="ring" />}
                  <circle cx={px(n.id)} cy={py(n.id)} r="19" />
                  <text x={px(n.id)} y={py(n.id) + 5} textAnchor="middle">{n.ch}</text>
                  <text x={px(n.id)} y={py(n.id) + 38} textAnchor="middle" className="sid">{n.id}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="legend"><i className="l1" />trie edge<i className="l2" />failure link<i className="l3" />double ring: end of a pattern</div>
        </div>

        <div className="side">
          <div className="glass explain">
            <h3>{s ? PHASES[s.ph] : 'Ready'}</h3>
            <p key={i} className="msg">{s ? s.msg : 'Choose patterns and text, then press Start.'}</p>
            {s && <div className="state mono">current state: <b>“{nodes[s.active].s || 'ε'}”</b> (node {s.active})</div>}
          </div>
          <div className="glass">
            <h3>Text scanning</h3>
            <div className="tape">
              {[...t].map((c, k) => {
                const inHit = hitSpan.some((h) => k >= h.start && k <= h.end)
                const cls = s && s.ph >= 2 ? (s.idx === k ? ' cur' : s.idx > k || s.ph === 3 ? ' seen' : '') : ''
                return <div key={k} className={'cell' + cls + (inHit ? ' hit' : '')}><b>{c}</b><small>{k}</small></div>
              })}
            </div>
          </div>
          <div className="glass">
            <h3>Matches found</h3>
            {shown.length === 0 ? <p className="muted">None yet.</p> : (
              <ul className="matches">
                {shown.map((m, k) => <li key={k} className={hitSpan.some((h) => h.pattern === m.pattern && h.end === m.end) ? 'fresh' : ''}><b className="mono">{m.pattern}</b><span>index {m.start}–{m.end}</span></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
