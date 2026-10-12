import { useEffect, useState } from 'react'
import * as api from '../services/api'
import { Head } from './Visualizer'
export default function Analytics({ result }) {
  const [a, setA] = useState(null)
  useEffect(() => { if (result) api.getAnalytics().then(setA); else setA(null) }, [result])
  if (!a) return <section><Head title="Search Analytics" sub="Pattern frequency and search statistics." /><div className="glass pad muted">Run a search to see analytics.</div></section>
  const max = Math.max(...a.frequency.map((f) => f.count), 1)
  const total = a.spamMatches + a.hamMatches || 1
  const top = [...a.frequency].sort((x, y) => y.count - x.count)[0]
  return (
    <section>
      <Head title="Search Analytics" sub="Pattern frequency and search statistics for the last search." />
      <div className="cards">
        <div className="glass stat"><small>Most frequent pattern</small><strong>{top.pattern}</strong></div>
        <div className="glass stat"><small>Average position</small><strong>{a.avgPosition}</strong></div>
        <div className="glass stat"><small>Occurrences per matched message</small><strong>{(result.totalOccurrences / (result.matchedMessages || 1)).toFixed(2)}</strong></div>
        <div className="glass stat"><small>Execution time</small><strong>{result.executionMs} ms</strong></div>
      </div>
      <div className="two">
        <div className="glass"><h3>Pattern frequency</h3>
          {a.frequency.map((f) => (
            <div className="bar" key={f.pattern}><span className="mono">{f.pattern}</span>
              <div><i style={{ width: (f.count / max) * 100 + '%' }} /></div><b className="mono">{f.count}</b></div>
          ))}
        </div>
        {a.perFile?.length && result.source === 'docs' ? (
          <div className="glass"><h3>Occurrences per file</h3>
            {a.perFile.map((f) => (<div className="bar" key={f.file}><span className="mono">{f.file}</span>
              <div><i style={{ width: (f.count / Math.max(...a.perFile.map((x) => x.count), 1)) * 100 + '%' }} /></div><b className="mono">{f.count}</b></div>))}
          </div>
        ) : (
        <div className="glass"><h3>Spam vs ham among matched messages</h3>
          <div className="split"><i style={{ width: (a.spamMatches / total) * 100 + '%' }} /></div>
          <p className="mono legend2"><span className="c1">spam {a.spamMatches}</span><span>ham {a.hamMatches}</span></p>
        </div>
        )}
      </div>
    </section>
  )
}
