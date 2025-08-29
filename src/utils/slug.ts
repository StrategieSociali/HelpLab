import { nanoid } from 'nanoid'

// slug base: minuscole, spazi → -, caratteri non [a-z0-9-] rimossi, trattini compattati
function basicSlugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')              // separa accenti
    .replace(/[\u0300-\u036f]/g, '')// rimuove segni diacritici
    .replace(/[^a-z0-9]+/g, '-')    // tutto ciò che non è a-z0-9 → -
    .replace(/^-+|-+$/g, '')        // trim trattini
    .replace(/-+/g, '-')            // compattazione
}

export function makeSlug(title: string) {
  const base = basicSlugify(title || 'challenge')
  return `${base}-${nanoid(6)}`
}
