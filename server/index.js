// server/index.js
// 120+ lines - a simple Node/Express proxy that fetches a site HTML, rewrites resource URLs,
// and returns a reconstructed HTML. This is a demo/prototype proxy — not production-ready.
// Paste into: server/index.js
//
// Run with: node server/index.js
//
// WARNING: Proxying arbitrary third-party sites can have legal and security issues.
// Use only for testing and with sites you control or where permitted.

const express = require('express')
const fetch = require('node-fetch')
const { URL } = require('url')
const app = express()
const PORT = process.env.PORT || 7777

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/**
 * Basic fetchSite function: fetches HTML and returns text
 * - sets a simple user agent to avoid some blocking
 */
async function fetchSiteText(targetUrl) {
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'SUB-Recoded-Proxy/1.0 (+https://example.com)'
    },
    redirect: 'follow',
    timeout: 15000
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('html')) {
    // return raw buffer for assets
    const buf = await res.buffer()
    return { isHtml: false, buffer: buf, contentType: ct }
  }
  const text = await res.text()
  return { isHtml: true, text, baseUrl: res.url }
}

/**
 * rewriteHtml: rewrites <link>, <script>, <img>, <a> href/src attributes to route through our proxy
 * Very naive implementation using regex and URL resolution. Works for simple pages.
 */
function rewriteHtml(html, baseUrl, proxyBase) {
  // helper to resolve relative urls
  function resolveUrl(u) {
    try {
      return new URL(u, baseUrl).href
    } catch (e) {
      return u
    }
  }

  // rewrite function for attributes
  const attrPatterns = [
    { tag: 'src', regex: /(<[^>]+?\s)(src)=("|'|)([^"'>\s]+)\3/gi },
    { tag: 'href', regex: /(<[^>]+?\s)(href)=("|'|)([^"'>\s]+)\3/gi }
  ]

  let out = html

  for (const p of attrPatterns) {
    out = out.replace(p.regex, (full, before, attrName, quote, url) => {
      // skip anchors and data: URIs and mailto/tel
      if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:')) {
        return full
      }
      const resolved = resolveUrl(url)
      // If it's an absolute URL to our proxy itself, leave it
      if (resolved.startsWith(proxyBase)) {
        return full.replace(url, resolved)
      }
      // build proxied url
      const proxUrl = proxyBase + encodeURIComponent(resolved)
      return before + attrName + '=' + quote + proxUrl + quote
    })
  }

  // also rewrite meta refresh tags
  out = out.replace(/<meta\s+http-equiv=["']refresh["'][^>]*content=["']\s*[^;]+;\s*url=([^"']+)["'][^>]*>/gi, (m, u) => {
    const resolved = resolveUrl(u)
    return `<meta http-equiv="refresh" content="0; url=${proxyBase + encodeURIComponent(resolved)}">`
  })

  // inject a small CSP relaxation note (not adding CSP headers)
  // Inject a small script to fix common relative base issues
  const injection = `<script>try{(function(){var base=document.querySelector('base'); if(!base){base=document.createElement('base'); base.href='${baseUrl}'; document.head && document.head.insertBefore(base, document.head.firstChild)} })()}catch(e){}</script>`

  // place injection before closing head
  out = out.replace(/<\/head>/i, injection + '\n</head>')

  return out
}

/**
 * /proxy?u=<encodedUrl>
 * Fetches target and returns either rewritten HTML or raw asset.
 */
app.get('/proxy', async (req, res) => {
  const u = req.query.u
  if (!u) return res.status(400).send('Missing u query param')
  let target
  try {
    target = decodeURIComponent(u)
  } catch (e) {
    target = u
  }

  // very small whitelist/blacklist (you may extend)
  if (target.includes('localhost') || target.includes('127.0.0.1')) {
    return res.status(403).send('Proxy to localhost is disabled for safety')
  }

  try {
    const fetched = await fetchSiteText(target)
    if (!fetched.isHtml) {
      // asset - forward buffer
      res.set('Content-Type', fetched.contentType || 'application/octet-stream')
      return res.send(fetched.buffer)
    }
    const rewritten = rewriteHtml(fetched.text, fetched.baseUrl || target, `${req.protocol}://${req.get('host')}/proxy?u=`)
    res.set('Content-Type', 'text/html; charset=utf-8')
    return res.send(rewritten)
  } catch (e) {
    console.error('Proxy fetch failed', e)
    return res.status(500).send('Proxy fetch failed: ' + e.message)
  }
})

/**
 * Basic health endpoint
 */
app.get('/_health', (req, res) => res.send({ ok: true, ts: Date.now() }))

/**
 * optional: asset route to pass-through via simple proxy
 * e.g. /asset?u=<encodedUrl>
 */
app.get('/asset', async (req, res) => {
  const u = req.query.u
  if (!u) return res.status(400).send('Missing u')
  try {
    const url = decodeURIComponent(u)
    const r = await fetch(url)
    const ct = r.headers.get('content-type') || 'application/octet-stream'
    res.set('Content-Type', ct)
    const buffer = await r.buffer()
    res.send(buffer)
  } catch (e) {
    console.error('Asset fetch failed', e)
    res.status(500).send('Asset fetch failed')
  }
})

/**
 * rate-limiting, caching, and security middlewares should be added for production.
 * This demo intentionally stays simple.
 */

app.listen(PORT, () => {
  console.log(`SUB Recoded proxy server listening on http://localhost:${PORT} — /proxy?u=<encodedUrl>`)
})

