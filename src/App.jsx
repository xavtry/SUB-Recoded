// src/App.jsx
// 100+ lines - orchestrator that wires components: AddressBar, Tabs, BrowserPane, Bookmarks, History.
// Paste to: src/App.jsx

import React, { useEffect, useMemo, useState } from 'react'
import AddressBar from './components/AddressBar'
import TabsComp from './components/Tabs'
import BrowserPane from './components/BrowserPane'
import BookmarkList from './components/BookmarkList'
import HistoryList from './components/HistoryList'
import storage, { pushHistory } from './utils/storage'

/**
 * Simple app that keeps state in localStorage and coordinates components.
 *
 * NOTE: This file is intentionally "meaty". It manages:
 *  - tabs array
 *  - active tab id
 *  - bookmarks/history via components
 *  - proxy server base URL (for local proxy)
 */

const DEFAULT_TABS = [{ id: 1, url: 'https://example.com', title: 'home', proxy: false }]

export default function App() {
  const [tabs, setTabs] = useState(() => storage.load('tabs', DEFAULT_TABS))
  const [activeId, setActiveId] = useState(() => storage.load('activeId', tabs[0]?.id || 1))
  const [proxyBase, setProxyBase] = useState(() => storage.load('proxyBase', 'http://localhost:7777/proxy?u='))
  const [sidebar, setSidebar] = useState('bookmarks') // 'bookmarks' | 'history' | 'settings'
  const [lastNavTs, setLastNavTs] = useState(null)

  // persist tabs & active
  useEffect(() => storage.save('tabs', tabs), [tabs])
  useEffect(() => storage.save('activeId', activeId), [activeId])
  useEffect(() => storage.save('proxyBase', proxyBase), [proxyBase])

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId) || tabs[0] || null, [tabs, activeId])

  function handleTabsChange(next) {
    setTabs(next)
  }

  function openInNewTab(url) {
    const id = Date.now()
    const t = { id, url, title: _titleFromUrl(url), proxy: false }
    setTabs(s => [...s, t])
    setActiveId(id)
  }

  function replaceActive(url) {
    if (!activeTab) return openInNewTab(url)
    setTabs(s => s.map(t => t.id === activeTab.id ? { ...t, url, title: _titleFromUrl(url) } : t))
  }

  function onIframeNavigate(url) {
    // push to history
    pushHistory({ url, ts: Date.now() })
    setLastNavTs(Date.now())
  }

  function onIframeBlocked(tabId) {
    // toggle UI hint or switch to proxy automatically
    setTabs(s => s.map(t => t.id === tabId ? { ...t, proxy: true } : t))
    alert('Tab blocked — proxy mode enabled for this tab')
  }

  function toggleProxyForActive() {
    if (!activeTab) return
    setTabs(s => s.map(t => t.id === activeTab.id ? { ...t, proxy: !t.proxy } : t))
  }

  function closeTabAndFocus(id) {
    setTabs(s => {
      const next = s.filter(t => t.id !== id)
      if (id === activeId) {
        setActiveId(next[0]?.id || null)
      }
      return next
    })
  }

  // small UI helpers
  function handleOpenFromSidebar(url) {
    openInNewTab(url)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="max-w-7xl mx-auto bg-slate-800 rounded-2xl shadow-lg overflow-hidden" style={{ height: '85vh' }}>
        {/* Top bar */}
        <div className="p-3 flex items-center gap-3 border-b border-slate-700">
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>

          <div className="flex-1">
            <AddressBar
              initial={activeTab?.url}
              onOpen={(url) => openInNewTab(url)}
              onReplace={(url) => replaceActive(url)}
              onQuickSearch={(q) => openInNewTab(q.includes(' ') ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : (q.startsWith('http') ? q : `https://${q}`))}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => {
              if (activeTab) storage.toggleInList('bookmarks', { url: activeTab.url, title: activeTab.title })
              alert('Toggled bookmark for current tab')
            }} className="px-3 py-2 bg-slate-700 rounded-md">Bookmark</button>

            <button onClick={() => toggleProxyForActive()} className="px-3 py-2 bg-slate-700 rounded-md">Toggle Proxy</button>
          </div>
        </div>

        {/* Tabs */}
        <TabsComp
          initialTabs={tabs}
          activeId={activeId}
          onChange={handleTabsChange}
          onSetActive={setActiveId}
        />

        {/* Content area */}
        <div className="flex h-[60%] bg-black">
          <div className="flex-1 h-full">
            {activeTab ? (
              <BrowserPane
                tab={activeTab}
                proxyBase={proxyBase}
                onNavigate={onIframeNavigate}
                onBlocked={onIframeBlocked}
              />
            ) : (
              <div className="p-8 text-center">No active tab. Open one from the top bar.</div>
            )}
          </div>

          <div className="w-96 border-l border-slate-700 p-3 bg-slate-900 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setSidebar('bookmarks')} className={`px-3 py-1 rounded ${sidebar === 'bookmarks' ? 'bg-slate-700' : 'bg-slate-800'}`}>Bookmarks</button>
              <button onClick={() => setSidebar('history')} className={`px-3 py-1 rounded ${sidebar === 'history' ? 'bg-slate-700' : 'bg-slate-800'}`}>History</button>
              <button onClick={() => setSidebar('settings')} className={`px-3 py-1 rounded ${sidebar === 'settings' ? 'bg-slate-700' : 'bg-slate-800'}`}>Settings</button>
            </div>

            <div className="flex-1 overflow-auto">
              {sidebar === 'bookmarks' && <BookmarkList onOpen={handleOpenFromSidebar} />}
              {sidebar === 'history' && <HistoryList onOpen={handleOpenFromSidebar} />}
              {sidebar === 'settings' && (
                <div className="p-2 space-y-3">
                  <div>
                    <label className="text-sm">Proxy base URL</label>
                    <input className="w-full px-2 py-1 bg-slate-800 rounded mt-1" value={proxyBase} onChange={e => setProxyBase(e.target.value)} />
                    <div className="text-xs text-slate-500 mt-1">Example: http://localhost:7777/proxy?u=</div>
                  </div>

                  <div>
                    <button onClick={() => { storage.clearAll(); window.location.reload() }} className="px-3 py-2 rounded bg-red-600">Reset All Data</button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400">
              Last navigation: {lastNavTs ? new Date(lastNavTs).toLocaleString() : 'none'}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="p-3 text-sm text-slate-400 border-t border-slate-700">
          SUB Recoded — Local demo. Proxy mode is optional and requires a running server.
        </div>
      </div>
    </div>
  )
}

/* helpers */
function _titleFromUrl(url) {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch (e) {
    return url
  }
}

