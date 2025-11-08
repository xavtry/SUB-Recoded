
// src/components/BrowserPane.jsx
// 100+ lines - renders the active tab inside an iframe and falls back to proxy URL
// Paste to: src/components/BrowserPane.jsx

import React, { useEffect, useRef, useState } from 'react'

/**
 * Props:
 *  - tab: { id, url, title, proxy }   // proxy boolean indicates if proxy mode preferred
 *  - proxyBase: string | null  // e.g. http://localhost:7777/proxy?u=
 *  - onNavigate(newUrl) - called when iframe navigates (same-origin only)
 *  - onBlocked(tabId) - called when iframe blocked
 */

export default function BrowserPane({ tab, proxyBase = null, onNavigate, onBlocked }) {
  const iframeRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(() => _computeSrc(tab, proxyBase))
  const [keySuffix, setKeySuffix] = useState(0)

  useEffect(() => {
    setBlocked(false)
    setLoading(true)
    setCurrentSrc(_computeSrc(tab, proxyBase))
    setKeySuffix(k => k + 1) // force new iframe key so it reloads
  }, [tab?.url, tab?.proxy, proxyBase])

  useEffect(() => {
    // attach load listener
    const iframe = iframeRef.current
    if (!iframe) return
    function onLoad() {
      setLoading(false)
      setBlocked(false)
      // Try to call onNavigate for same-origin frames
      try {
        const href = iframe.contentWindow.location.href
        onNavigate && onNavigate(href)
      } catch (e) {
        // cross-origin - cannot access location
      }
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [onNavigate])

  function handleError() {
    setLoading(false)
    setBlocked(true)
    onBlocked && onBlocked(tab?.id)
  }

  function reload() {
    setLoading(true)
    setKeySuffix(k => k + 1)
    // reassign src to reload
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = currentSrc
    }
  }

  function openExternally() {
    window.open(tab.url, '_blank', 'noopener')
  }

  return (
    <div className="relative h-full bg-black">
      <div className="absolute top-2 left-2 z-40 flex gap-2">
        <button onClick={reload} className="px-3 py-1 rounded bg-slate-700">Reload</button>
        <button onClick={() => navigator.clipboard?.writeText(tab.url)} className="px-3 py-1 rounded bg-slate-700">Copy URL</button>
        <button onClick={openExternally} className="px-3 py-1 rounded bg-slate-700">Open</button>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="p-3 rounded bg-slate-800/80">Loading...</div>
        </div>
      )}

      {blocked ? (
        <div className="w-full h-full flex items-center justify-center text-center p-6 z-20">
          <div>
            <div className="text-2xl mb-2">This site blocked embedding</div>
            <div className="mb-4 text-slate-400">Try proxy mode to attempt a full render.</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => {
                if (!proxyBase) { alert('No proxy server configured') ; return }
                // if there's a proxy available, rewrite to proxied URL
                const prox = _makeProxyUrl(tab.url, proxyBase)
                iframeRef.current && (iframeRef.current.src = prox)
                setBlocked(false)
                setLoading(true)
                setCurrentSrc(prox)
              }} className="px-3 py-2 rounded bg-slate-700">Use Proxy</button>

              <button onClick={openExternally} className="px-3 py-2 rounded bg-slate-700">Open in New Tab</button>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          key={`iframe-${tab.id}-${keySuffix}`}
          ref={iframeRef}
          src={currentSrc}
          onError={handleError}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="" // intentionally blank to allow normal behavior; in prod tighten this
        />
      )}
    </div>
  )
}

/* helpers */
function _computeSrc(tab, proxyBase) {
  if (!tab) return 'about:blank'
  if (tab.proxy && proxyBase) return _makeProxyUrl(tab.url, proxyBase)
  return tab.url
}

function _makeProxyUrl(url, proxyBase) {
  // proxyBase should include trailing path like http://localhost:7777/proxy?u=
  return `${proxyBase}${encodeURIComponent(url)}`
}
