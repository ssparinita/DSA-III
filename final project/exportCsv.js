export function exportCsv(rows) {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"'
  const csv = '\uFEFF' + ['message_id,pattern,position,label,message', ...rows.map((r) => [r.id, q(r.pattern), r.position, r.label, q(r.message)].join(','))].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'matches.csv'; a.click(); URL.revokeObjectURL(a.href)
}
