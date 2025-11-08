// src/components/AddressBar.jsx
// 100+ lines - Address/search box with suggestions and open actions.
// Paste to: src/components/AddressBar.jsx

import React, { useEffect, useRef, useState } from 'react'

/**
 * normalizeInput
 * - if contains spaces -> google search
 * - if starts with protocol -> return as is
 * - else -> prepend https://
 */
function normalizeInput(raw) {
  if (!raw) return 'https://example.com'
  const s = raw.trim()
  if (s.includes(' ')) return `https://www.google.com/search?q=${encodeURIComponent(s)}`
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s // protocol present (http:, ftp:, etc)
  return `https://${s}`
}

/**
 * small suggestion heuristics
 */
function getSuggestions(query) {
  const base = [
    'example.com',
    'github.com',
    'wikipedia.org',
    'news.google.com',
    'youtube.com',
    'reddit.com'
  ]
  if (!query) return base
  const q = query.toLowerCase()
  return base.filter(s => s.includes(q)).slice(0, 8)
}

/**
 * AddressBar props:
 * - initial (string) optional
 * - onOpen(url) opens in new tab
 * - onReplace(url) replaces current tab with url (optional)
 * - onQuickSearch(query) quick action
 */
export default function AddressBar({ initial = '', onOpen, onReplace, onQuickSearch }) {
  const [value, setValue] = useState(initial || '')
  const [show, setShow] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    setSuggestions(getSuggestions(value))
  }, [value])

  useEffect(() => {
    // focus input when component mounts
    setTimeout(() => inputRef.current?.focus?.(), 120)
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const url = normalizeInput(value)
      if (e.metaKey || e.ctrlKey) {
        onOpen && onOpen(url)
      } else {
        // default behavior: replace current tab if replace available, else open new
        if (onReplace) onReplace(url)
        else onOpen && onOpen(url)
      }
      setShow(false)
      setValue('')
    } else if (e.key === 'Escape') {
      setShow(false)
      setValue('')
      inputRef.current?.blur()
    }
  }

  function handleOpenClick() {
    const url = normalizeInput(value || 'example.com')
    onOpen && onOpen(url)
    setValue('')
    setShow(false)
  }

  function handleReplaceClick() {
    const url = normalizeInput(value || 'example.com')
    if (onReplace) onReplace(url)
    else onOpen && onOpen(url)
    setValue('')
    setShow(false)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          className="w-full bg-slate-700 placeholder-slate-400 px-3 py-2 rounded-md outline-none"
          placeholder="Type a URL or search and press Enter"
          value={value}
          onChange={(e) => { setValue(e.target.value); setShow(true) }}
          onFocus={() => setShow(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            onClick={() => { setValue(''); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-slate-300"
            title="Clear"
          >
            ✕
          </button>
        )}

        {show && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-slate-800 rounded shadow-lg z-50 p-1 max-h-48 overflow-auto">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="p-2 hover:bg-slate-700 rounded cursor-pointer"
                onClick={() => { setValue(s); inputRef.current?.focus(); setShow(false) }}
              >
                {s}
              </div>
            ))}
            <div className="text-xs text-slate-500 p-2">Tip: Press Enter to open. Cmd/Ctrl+Enter opens in a new tab.</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handleOpenClick} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">Open</button>
        <button onClick={handleReplaceClick} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">Replace</button>
        <button onClick={() => onQuickSearch && onQuickSearch(value)} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600">Quick</button>
      </div>
    </div>
  )
}

