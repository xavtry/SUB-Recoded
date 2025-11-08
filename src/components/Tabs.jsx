
// src/components/Tabs.jsx
// 100+ lines - Tabs manager with open/close/rename and simple reorder.
// Paste to: src/components/Tabs.jsx

import React, { useEffect, useRef, useState } from 'react'

/**
 * Tab shape:
 *  { id: number|string, url: string, title: string, proxy: boolean }
 *
 * Props:
 *  - initialTabs: []
 *  - activeId
 *  - onChange(tabs)
 *  - onSetActive(id)
 */
export default function Tabs({ initialTabs = [], activeId, onChange, onSetActive }) {
  const [tabs, setTabs] = useState(initialTabs)
  const idRef = useRef(1)

  useEffect(() => {
    // re-seed idRef so new ids don't conflict
    const max = tabs.reduce((m, t) => (t.id > m ? t.id : m), 0)
    idRef.current = max + 1
    // notify parent
    onChange && onChange(tabs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onChange && onChange(tabs)
  }, [tabs, onChange])

  function addTab(url = 'https://example.com', makeActive = true) {
    const id = idRef.current++
    const t = { id, url, title: _titleFromUrl(url), proxy: false }
    setTabs(s => {
      const next = [...s, t]
      if (makeActive) onSetActive && onSetActive(id)
      return next
    })
  }

  function closeTab(id) {
    setTabs(s => {
      const next = s.filter(t => t.id !== id)
      if (id === activeId && next.length > 0) {
        onSetActive && onSetActive(next[Math.max(0, next.length - 1)].id)
      }
      return next
    })
  }

  function renameTab(id) {
    const value = prompt('Rename tab (title):')
    if (value === null) return
    setTabs(s => s.map(t => t.id === id ? { ...t, title: value } : t))
  }

  function replaceUrl(id) {
    const value = prompt('Enter URL:')
    if (!value) return
    setTabs(s => s.map(t => t.id === id ? { ...t, url: _norm(value), title: _titleFromUrl(value) } : t))
  }

  function toggleProxy(id) {
    setTabs(s => s.map(t => t.id === id ? { ...t, proxy: !t.proxy } : t))
  }

  function moveTab(oldIndex, newIndex) {
    if (oldIndex === newIndex) return
    setTabs(s => {
      const arr = [...s]
      const [item] = arr.splice(oldIndex, 1)
      arr.splice(newIndex, 0, item)
      return arr
    })
  }

  return (
    <div className="flex items-center gap-2 p-2 overflow-x-auto bg-slate-800 app-scrollbar">
      {tabs.map((t, idx) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-3 py-1 rounded whitespace-nowrap ${t.id === activeId ? 'bg-slate-700' : 'bg-slate-900/40 hover:bg-slate-700/30'}`}
        >
          <div className="cursor-pointer max-w-[220px] truncate" onClick={() => onSetActive && onSetActive(t.id)} title={t.url}>
            <div className="text-sm">{t.title}</div>
            <div className="text-xs text-slate-400 truncate max-w-[220px]">{t.url}</div>
          </div>

          <div className="flex gap-1">
            <button title="Rename" onClick={() => renameTab(t.id)} className="text-xs px-2 py-0.5 rounded bg-slate-700">✎</button>
            <button title="Replace URL" onClick={() => replaceUrl(t.id)} className="text-xs px-2 py-0.5 rounded bg-slate-700">↻</button>
            <button title="Toggle Proxy" onClick={() => toggleProxy(t.id)} className="text-xs px-2 py-0.5 rounded bg-slate-700">{t.proxy ? 'P' : 'p'}</button>
            <button title="Close" onClick={() => closeTab(t.id)} className="text-xs px-2 py-0.5 rounded bg-red-600">✕</button>
          </div>
        </div>
      ))}

      <div className="ml-2">
        <button
          onClick={() => addTab('https://example.com')}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          + New
        </button>
      </div>

      <div className="ml-auto flex gap-2 items-center">
        <button onClick={() => setTabs([])} className="px-3 py-1 rounded bg-slate-700/50">Clear</button>
        <button onClick={() => {
          const url = prompt('Open URL in new tab:')
          if (url) addTab(_norm(url))
        }} className="px-3 py-1 rounded bg-slate-700/50">Open URL...</button>
      </div>
    </div>
  )
}

/* helpers */
function _norm(url) {
  const s = (url || '').trim()
  if (!s) return 'https://example.com'
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s
  return `https://${s}`
}
function _titleFromUrl(url) {
  try {
    const u = new URL(_norm(url))
    return u.hostname.replace('www.', '')
  } catch (e) {
    return url
  }
}
