// src/utils/storage.js
// 100+ lines - LocalStorage wrapper with versioning, TTL, and helpers.
//
// Usage:
//   import { save, load, remove, clearAll, withExpiry } from './utils/storage'
//   save('tabs', tabs)
//   const tabs = load('tabs', [])
//
// This file intentionally contains many helper utilities and comments to be "meaty".

const PREFIX = 'sub_recoded_v1:'
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

function _key(k) {
  return PREFIX + k
}

function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch (e) {
    console.warn('safeJSONParse failed', e)
    return fallback
  }
}

/**
 * save(key, value, options)
 * options:
 *   { ttl: milliseconds | null, meta: object }
 */
export function save(key, value, options = {}) {
  try {
    const payload = {
      v: 1,
      ts: Date.now(),
      ttl: options.ttl ?? null,
      meta: options.meta ?? null,
      data: value
    }
    localStorage.setItem(_key(key), JSON.stringify(payload))
  } catch (e) {
    console.warn('Storage save failed for key', key, e)
  }
}

/**
 * load(key, fallback)
 * returns fallback if not present or expired
 */
export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(_key(key))
    if (raw === null) return fallback
    const parsed = safeJSONParse(raw, null)
    if (!parsed) return fallback
    if (parsed.ttl && parsed.ts) {
      const age = Date.now() - parsed.ts
      if (age > parsed.ttl) {
        // expired
        localStorage.removeItem(_key(key))
        return fallback
      }
    }
    return parsed.data ?? fallback
  } catch (e) {
    console.warn('Storage load failed for key', key, e)
    return fallback
  }
}

/**
 * remove(key)
 */
export function remove(key) {
  try {
    localStorage.removeItem(_key(key))
  } catch (e) {
    console.warn('Storage remove failed', e)
  }
}

/**
 * clearAll() - removes only keys that belong to this app's prefix
 */
export function clearAll() {
  try {
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch (e) {
    console.warn('Storage clearAll failed', e)
  }
}

/**
 * withExpiry(fn, key, ttl) - helper that runs fn to compute new value if expired or missing
 * returns current value (possibly computed)
 */
export async function withExpiry(key, computeFn, ttl = DEFAULT_TTL_MS) {
  const cur = load(key, null)
  if (cur !== null) return cur
  const newVal = await computeFn()
  save(key, newVal, { ttl })
  return newVal
}

/**
 * export convenience wrappers for JSON-safe operations
 */
export function saveJSON(key, jsonable, ttl = null) {
  save(key, jsonable, { ttl })
}

export function loadJSON(key, fallback = null) {
  return load(key, fallback)
}

/* ---------- Example small utilities below (useful inside app) ---------- */

/**
 * pushHistory(item, key = 'history', limit = 200)
 * item should be serializable (object with url, ts etc.)
 */
export function pushHistory(item, key = 'history', limit = 200) {
  try {
    const cur = load(key, [])
    const normalized = [item, ...cur.filter(i => i.url !== item.url)].slice(0, limit)
    save(key, normalized)
    return normalized
  } catch (e) {
    console.warn('pushHistory failed', e)
    return []
  }
}

/**
 * toggleItemInList(key, item, idKey = 'url')
 */
export function toggleInList(key, item, idKey = 'url') {
  try {
    const cur = load(key, [])
    const exists = cur.find(i => i[idKey] === item[idKey])
    let next
    if (exists) next = cur.filter(i => i[idKey] !== item[idKey])
    else next = [item, ...cur]
    save(key, next)
    return next
  } catch (e) {
    console.warn('toggleInList failed', e)
    return []
  }
}

/* export everything default too */
const storage = { save, load, remove, clearAll, withExpiry, saveJSON, loadJSON, pushHistory, toggleInList }
export default storage

