// src/utils/serialize.ts
/**
 * Scopo: utility condivise per la serializzazione delle risposte API
 *
 * serializeBigInt: converte ricorsivamente i BigInt in Number e le Date in ISO string.
 * Necessario perché JSON.stringify non supporta BigInt nativamente.
 */
export function serializeBigInt(obj: any): any {
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === 'bigint' ? Number(value) : serializeBigInt(value)
      ])
    )
  }
  return obj
}