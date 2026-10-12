import { Head } from './Visualizer'
import MessageTable from './MessageTable'
import { exportCsv } from '../lib/exportCsv'
export default function SearchPanel({ docs = [], upload, removeDoc, lang, setLang, text, setText, opts, setOpts, built, result, status, busy, onBuild, onSearch, isMock, go }) {
  const byPat = result ? result.patterns.map((p) => { const m = result.matches.filter((x) => x.pattern === p); return { p, n: m.length, pos: m.slice(0, 6).map((x) => x.position) } }) : []
  return (
    <section>
      <Head title="Search Dataset" sub="Enter several patterns separated by commas. Build the automaton once, then scan the whole dataset." />
      {isMock && <div className="note">Demo data layer active: results come from a placeholder, not from Aho–Corasick. Connect the Java backend in <code>src/services/api.js</code>.</div>}
      <div className="glass">
        <h3>Search in</h3>
        <div className="btns" style={{ marginTop: 0 }}>
          <select value={opts.source} onChange={(e) => setOpts({ ...opts, source: e.target.value })}>
            <option value="dataset">SMS Spam dataset</option>
            <option value="docs" disabled={!docs.length}>My uploaded files ({docs.length})</option>
            <option value="both" disabled={!docs.length}>Dataset + my files</option>
          </select>
          <label className="btn ghost" style={{ cursor: 'pointer' }}>Upload files (PDF, DOCX, TXT, image…)
            <input type="file" multiple hidden accept=".pdf,.docx,.txt,.csv,.md,.json,.log,.html,.htm,.xml,.png,.jpg,.jpeg,.bmp,.gif,.webp,.tif,.tiff" onChange={(e) => { if (e.target.files.length) upload([...e.target.files]); e.target.value = '' }} /></label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} title="Language used when reading text from images">
            <option value="eng">Image language: English</option><option value="hin">Hindi</option><option value="tel">Telugu</option>
            <option value="eng+hin">English + Hindi</option><option value="spa">Spanish</option><option value="fra">French</option>
            <option value="deu">German</option><option value="jpn">Japanese</option><option value="chi_sim">Chinese</option><option value="ara">Arabic</option>
          </select>
        </div>
        {docs.length > 0 && <div className="btns">{docs.map((d) => (
          <span key={d.id} className="tag">{d.name} <small className="muted">· {d.type} · {d.lineCount} lines</small> <a style={{ cursor: 'pointer' }} onClick={() => removeDoc(d.id)} title="Remove">✕</a></span>))}</div>}
      </div>
      <div className="glass">
        <label className="big">Patterns<input value={text} onChange={(e) => setText(e.target.value)} placeholder="free, winner, cash, prize" spellCheck="false" /></label>
        <div className="btns">
          <label className="muted"><input type="checkbox" checked={opts.caseSensitive} onChange={(e) => setOpts({ ...opts, caseSensitive: e.target.checked })} /> Case sensitive</label>
          <label className="muted"><input type="checkbox" checked={opts.wholeWord} onChange={(e) => setOpts({ ...opts, wholeWord: e.target.checked })} /> Whole word only</label>
          <label className="btn ghost" style={{ cursor: 'pointer' }}>Import keywords (.txt)
            <input type="file" accept=".txt,.csv" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) setText((await f.text()).split(/[\r\n,]+/).map((x) => x.trim()).filter(Boolean).join(', ')); e.target.value = '' }} /></label>
        </div>
        <div className="btns">
          <button className="btn" onClick={onBuild} disabled={busy}>Build Automaton</button>
          <button className="btn primary" onClick={onSearch} disabled={busy}>Search Dataset</button>
          <span className="pill"><i className={'dot ' + (busy ? 'busy' : built ? 'ok' : '')} />{status}</span>
        </div>
        {built && <p className="muted mono">automaton: {built.patternCount} patterns, {built.nodeCount} nodes, built in {built.buildMs} ms</p>}
      </div>
      {result && (<>
        <div className="cards">
          <div className="glass stat"><small>Matched messages</small><strong>{result.matchedMessages.toLocaleString()}</strong></div>
          <div className="glass stat"><small>Occurrences</small><strong>{result.totalOccurrences.toLocaleString()}</strong></div>
          <div className="glass stat"><small>Execution time</small><strong>{result.executionMs} ms</strong>{result.naiveMs != null && <small className="muted">naive indexOf scan: {result.naiveMs} ms</small>}</div>
        </div>
        <div className="glass"><h3>Patterns and positions</h3>
          <div className="scroll"><table><thead><tr><th>Pattern</th><th>Occurrences</th><th>First positions (char index)</th></tr></thead>
            <tbody>{byPat.map((r) => <tr key={r.p}><td><span className="tag">{r.p}</span></td><td className="mono">{r.n.toLocaleString()}</td><td className="mono">{r.pos.join(', ') || '—'}</td></tr>)}</tbody></table></div>
        </div>
        <div className="glass"><h3>Matching SMS messages <small className="muted">(first 8)</small></h3>
          <MessageTable rows={result.matches.slice(0, 8)} />
          <button className="btn ghost more" onClick={() => go('matches')}>Open all matches</button>
          <button className="btn ghost more" onClick={() => exportCsv(result.matches)}>Export matches (CSV)</button></div>
      </>)}
    </section>
  )
}
