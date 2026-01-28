 // src/pages/sponsors/SponsorsList.jsx
/**
 * Scopo: mostra l’elenco pubblico degli sponsor di HelpLab
 *
 * Attualmente supporta:
 * - lista sponsor pubblica
 * - ricerca per nome
 * - paginazione a cursore
 * - accesso al profilo sponsor
 *
 * Note:
 * - READ-ONLY
 * - nessuna autenticazione richiesta
 * - usa GET /api/v1/sponsors
 */

import React, { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { routes } from "@/routes"

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")
const PAGE_SIZE = 12

export default function SponsorsList() {
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSponsors = useCallback(async ({ reset = false } = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set("limit", PAGE_SIZE)

      if (!reset && cursor) params.set("cursor", cursor)
      const q = search.trim()
      if (q.length > 0) params.set("search", q)

      const res = await fetch(`${API_BASE}/v1/sponsors?${params.toString()}`)
      if (!res.ok) throw new Error("Errore caricamento sponsor")

      const data = await res.json()

      setItems(prev => reset ? data.items : [...prev, ...data.items])
      setCursor(data.nextCursor)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [cursor, search])

  // prima fetch + cambio search
 useEffect(() => {
  setItems([])
  setCursor(null)
  fetchSponsors({ reset: true })
}, [search, fetchSponsors])

  return (
    <section className="page-section page-text">
      <div className="container">
        <h1 className="page-title">I nostri sponsor</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Le organizzazioni che rendono possibili le sfide di HelpLab
        </p>
        
  {/* CTA Sponsor */}
<div className="card muted" style={{ margin: "16px 0", padding: 16 }}>
  <strong>Sei un’azienda o un’organizzazione?</strong>

  <p className="small" style={{ margin: "6px 0 12px" }}>
    Puoi sostenere una challenge e generare impatto concreto.
  </p>

  <div style={{ marginTop: 28 }}>
    <Link to="/business/packages" className="btn btn-sm btn-outline">
      Diventa sponsor
    </Link>
  </div>
</div>



        <div className="form-group sponsor-search">
         <input
           type="search"
            placeholder="Cerca sponsor…"
            value={search}
           onChange={(e) => setSearch(e.target.value)}
             />
           </div>

        {error && <p className="muted">{error}</p>}
      <div className="sponsors-grid-wrapper">
        <div className="sponsors-grid">
          {items.map(s => (
            <div key={s.id} className="card sponsor-card">
              {s.logo_url && (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  loading="lazy"
                  className="sponsor-logo"
                />
              )}

              <h3>{s.name}</h3>

              {s.website && (
               <div className="sponsor-card__website">
                🌐 {new URL(s.website).hostname.replace("www.", "")}
              </div>
               )}

            <Link
              to={routes.community.sponsorProfile(s.id)}
              className="btn btn-outline sponsor-card__cta"
            >
             Scopri
           </Link>
            </div>
          ))}
        </div>
        </div>

        {cursor && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button
              className="btn btn-ghost"
              disabled={loading}
              onClick={() => fetchSponsors()}
            >
              {loading ? "Caricamento…" : "Carica altri"}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
