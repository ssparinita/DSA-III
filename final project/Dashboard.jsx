import { Head } from './Visualizer'
export default function Dashboard({ info, patterns, result, status, go }) {
  const cards = [
    ['Dataset', info.name],
    ['Messages loaded', info.count ? info.count.toLocaleString() : '…'],
    ['Number of patterns', patterns.length],
    ['Messages matched', result ? result.matchedMessages.toLocaleString() : '—'],
    ['Total occurrences', result ? result.totalOccurrences.toLocaleString() : '—'],
    ['Search status', status],
  ]
  return (
    <section>
      <Head title="Multi-Pattern Search Engine" sub="Find many keywords in thousands of messages in a single pass." />
      <div className="hero glass">
        <div>
          <h3>Aho–Corasick automaton</h3>
          <p>A trie of all patterns, extended with failure links so the scanner never backs up. Scan time grows with the text length plus the matches found, however many patterns are added.</p>
          <div className="btns"><button className="btn primary" onClick={() => go('viz')}>Open visualizer</button><button className="btn" onClick={() => go('search')}>Search dataset</button></div>
        </div>
        <div className="mini mono" aria-hidden>
          {['h', 'e', 'r', 's'].map((c, k) => <span key={k} style={{ animationDelay: k * 0.45 + 's' }}>{c}</span>)}
        </div>
      </div>
      <div className="cards">
        {cards.map(([k, v]) => <div key={k} className="glass stat"><small>{k}</small><strong>{v}</strong></div>)}
      </div>
    </section>
  )
}
