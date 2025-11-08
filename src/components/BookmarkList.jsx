
// src/components/BookmarkList.jsx
// 100+ lines - shows bookmarks, with open/remove actions and grouping.
// Paste to: src/components/BookmarkList.jsx

import React, { useEffect, useState } from 'react'
import { load, save, toggleInList } from '../utils/storage'

/**
 * Props:
 *   - storageKey (string) default 'bookmarks'
 *   - onOpen(url)
 */
export default function BookmarkList({ storageKey = 'bookmarks', onOpen }) {
  const [bookmarks, setBookmarks] = useState(() => load(storageKey, []))
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    save(storageKey, bookmarks)
  }, [bookmarks, storageKey])

  function addBookmark(url, title) {
    if (!url) return
    const item = { url, title: title || url, ts: Date.now() }
    setBookmarks(s => [item, ...s.filter(b => b.url !== url)])
  }

  function removeBookmark(url) {
    setBookmarks(s => s.filter(b => b.url !== url))
  }

  function editBookmark(url) {
    const b = bookmarks.find(x => x.url === url)
    if (!b) return
    const newTitle = prompt('Edit title', b.title)
    if (newTitle === null) return
    setBookmarks(s => s.map(x => x.url === url ? { ...x, title: newTitle } : x))
  }

  function importBookmarks(jsonStr) {
    try {
      const data = JSON.parse(jsonStr)
      if (!Array.isArray(data)) { alert('Invalid import format - expected array'); return }
      // merge unique by url
      const byUrl = {}
      for (const b of [...data, ...bookmarks]) {
        if (b.url) byUrl[b.url] = { url: b.url, title: b.title || b.url, ts: b.ts || Date.now() }
      }
      const merged = Object.values(byUrl).sort((a, b) => b.ts - a.ts)
      setBookmarks(merged)
      alert('Imported ' + merged.length + ' bookmarks')
    } catch (e) {
      alert('Import failed: ' + e.message)
    }
  }

  function exportBookmarks() {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookmarks.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = bookmarks.filter(b => !filter || (b.title + ' ' + b.url).toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="p-2 bg-slate-900 rounded h-full flex flex-col">
      <div className="flex gap-2 items-center mb-2">
        <input className="flex-1 px-2 py-1 bg-slate-800 rounded" placeholder="Filter bookmarks" value={filter} onChange={e => setFilter(e.target.value)} />
        <button onClick={() => {
          const url = prompt('Bookmark URL:')
          if (!url) return
          const title = prompt('Title (optional):')
          addBookmark(url, title)
        }} className="px-3 py-1 rounded bg-slate-700">Add</button>
        <button onClick={exportBookmarks} className="px-3 py-1 rounded bg-slate-700">Export</button>
        <button onClick={() => {
          const inp = prompt('Paste bookmarks JSON array:')
          if (!inp) return
          importBookmarks(inp)
        }} className="px-3 py-1 rounded bg-slate-700">Import</button>
      </div>

      <div className="flex-1 overflow-auto p-1 app-scrollbar">
        {filtered.length === 0 && <div className="text-slate-500 p-2">No bookmarks</div>}
        {filtered.map(b => (
          <div key={b.url} className="p-2 rounded hover:bg-slate-800 flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{b.title}</div>
              <div className="text-xs text-slate-400 truncate">{b.url}</div>
            </div>
            <div className="flex flex-col gap-1 ml-2">
              <button title="Open" onClick={() => onOpen && onOpen(b.url)} className="px-2 py-1 rounded bg-slate-700 text-sm">Open</button>
              <button title="Edit" onClick={() => editBookmark(b.url)} className="px-2 py-1 rounded bg-slate-700 text-sm">Edit</button>
              <button title="Remove" onClick={() => removeBookmark(b.url)} className="px-2 py-1 rounded bg-red-600 text-sm">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Bookmarks stored locally in your browser.
      </div>
    </div>
  )
}
