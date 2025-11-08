// src/components/HistoryList.jsx
// 100+ lines - history viewer with open and clear actions
// Paste to: src/components/HistoryList.jsx

import React, { useEffect, useState } from 'react'
import { load, save } from '../utils/storage'

export default function HistoryList({ storageKey = 'history', onOpen }) {
  const [history, setHistory] = useState(() => load(storageKey, []))
  const [filter, setFilter] = useState('')

  useEffect(() => {
    save(storageKey, history)
  }, [history, storageKey])

  function push(url) {
    const item = { url, ts: Date.now() }
    setHistory(s => [item, ...s.filter(i => i.url !== url)].slice(0, 500))
  }

  function clear() {
    if (!confirm('Clear history?')) return
    setHistory([])
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'history.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = history.filter(h => !filter || h.url.toLowerCase().includes(filter.toLowerCase())).slice(0, 200)

  return (
    <div className="p-2 bg-slate-900 rounded h-full flex flex-col">
      <div className="flex gap-2 items-center mb-2">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter history" className="flex-1 px-2 py-1 bg-slate-800 rounded" />
        <button onClick={exportHistory} className="px-3 py-1 rounded bg-slate-700">Export</button>
        <button onClick={clear} className="px-3 py-1 rounded bg-red-600">Clear</button>
      </div>

      <div className="flex-1 overflow-auto app-scrollbar p-1">
        {filtered.length === 0 && <div className="text-slate-500 p-2">No history yet</div>}
        {filtered.map((h, idx) => (
          <div key={h.ts + '-' + idx} className="p-2 rounded hover:bg-slate-800 flex justify-between items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm">{h.url}</div>
              <div className="text-xs text-slate-400">{new Date(h.ts).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onOpen && onOpen(h.url)} className="px-2 py-1 rounded bg-slate-700 text-sm">Open</button>
              <button onClick={() => {
                navigator.clipboard?.writeText(h.url)
                alert('Copied URL to clipboard')
              }} className="px-2 py-1 rounded bg-slate-700 text-sm">Copy</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-500">History kept locally. Use export to save it.</div>
    </div>
  )
}
