// src/utils/memoryCache.ts
/**
 * Scopo: costruire una memory cache locale
 *
 * Nessuna dipendenza esterna
 * Zero errori legati a callback o Catbox
 * Pulita, mantenibile e moderna
 * Adatta a produzione su singola istanza
 * Comportamento prevedibile e controllabile
 */
type CacheEntry = {
  value: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function setCache(key: string, value: any, ttlMs: number = 60000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  })
}

export function getCache(key: string) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value
}

export function clearCache() {
  cache.clear()
}

export function deleteCache(key: string) {
  cache.delete(key)
}

