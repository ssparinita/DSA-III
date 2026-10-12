import { useEffect, useState } from 'react'
import * as api from './services/api'
import Dashboard from './components/Dashboard'
import SearchPanel from './components/SearchPanel'
import Visualizer, { Head } from './components/Visualizer'
import Analytics from './components/Analytics'
import MessageTable from './components/MessageTable'

const TABS = [['dash', 'Dashboard'], ['search', 'Search Dataset'], ['viz', 'Visualizer'], ['analytics', 'Analytics'], ['matches', 'Matches']]
const parse = (s, cs = false) => [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).map((x) => (cs ? x : x.toLowerCase())))]

export default function App() {
  const [tab, setTab] = useState('dash')
  const [info, setInfo] = useState({ name: 'SMS Spam Collection', count: 0 })
  const [text, setText] = useState('free, winner, cash, prize')
  const [built, setBuilt] = useState(null)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('Idle')
  const [busy, setBusy] = useState(false)
  const [docs, setDocs] = useState([])
  const [lang, setLang] = useState('eng')
  const [opts, setOpts] = useState({ caseSensitive: false, wholeWord: false, source: 'dataset' })
  useEffect(() => { setBuilt(null) }, [opts.caseSensitive])
  useEffect(() => { api.getDocuments().then(setDocs).catch(() => {}) }, [])
  const upload = async (files) => {
    setBusy(true)
    try {
      for (const f of files) { setStatus('Reading ' + f.name + '…'); await api.uploadDocument(f, lang) }
      setDocs(await api.getDocuments()); setStatus(files.length + ' file(s) added')
    } catch (e) { setStatus('Error: ' + e.message) } finally { setBusy(false) }
  }
  const removeDoc = async (id) => { await api.deleteDocument(id); setDocs(await api.getDocuments()) }
  useEffect(() => { api.getDatasetInfo().then(setInfo).catch(() => setStatus('Backend unreachable')) }, [])

  const run = async (fn, label) => {
    setBusy(true); setStatus(label)
    try { await fn() } catch (e) { setStatus('Error: ' + e.message) } finally { setBusy(false) }
  }
  const build = () => run(async () => { setBuilt(await api.buildAutomaton(parse(text, opts.caseSensitive), opts)); setStatus('Automaton ready') }, 'Building automaton…')
  const search = () => run(async () => {
    const p = parse(text, opts.caseSensitive)
    if (!p.length) return setStatus('Enter at least one pattern')
    setBuilt(await api.buildAutomaton(p, opts))
    setResult(await api.searchDataset(p, opts)); setStatus('Search complete')
  }, 'Searching dataset…')

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand"><span className="logo mono">AC</span><div><b>Multi-Pattern Search</b><small>Aho–Corasick, DSA project</small></div></div>
        <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      </nav>
      <main>
        {tab === 'dash' && <Dashboard info={info} patterns={parse(text, opts.caseSensitive)} result={result} status={status} go={setTab} />}
        {tab === 'search' && <SearchPanel {...{ docs, upload, removeDoc, lang, setLang, text, setText, opts, setOpts, built, result, status, busy, isMock: api.isMock, go: setTab }} onBuild={build} onSearch={search} />}
        {tab === 'viz' && <Visualizer />}
        {tab === 'analytics' && <Analytics result={result} />}
        {tab === 'matches' && (
          <section><Head title="Matching Messages" sub="Message ID, matched pattern, position and the message. Filter by text, pattern or label." />
            <div className="glass"><MessageTable rows={result?.matches || []} filterable /></div></section>
        )}
      </main>
    </div>
  )
}
