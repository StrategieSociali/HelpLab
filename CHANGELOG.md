# Changelog
Tutte le modifiche rilevanti a questo progetto verranno documentate in questo file.

Il formato si ispira a [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [0.2.0] – 2025-08-28
### Added
- **Learning Paths API**
  - `GET /api/learning-paths` – restituisce i percorsi con moduli.
  - `GET /api/learning-paths/progress?userId=...` – progressi utente (mock via query param).
  - `POST /api/learning-paths/:id/progress` – aggiorna i progressi di un modulo.
- **OpenAPI & Swagger**
  - Documentazione interattiva su `/api/docs`.
  - Esportazione JSON su `/api/openapi.json`.
- **Sicurezza & stabilità**
  - CORS ristretto a `https://helplab.space`.
  - Header di sicurezza tramite Helmet.
  - Rate limiting globale (60 req/min), POST sensibili protette.
- **Seed dati demo**
  - 2 percorsi di apprendimento con 6 moduli.
  - 2+ sfide demo disponibili con scoreboard base.

### Changed
- Logging più pulito e coerente con Pino.
- Struttura progetto backend rifinita (`routes/`, `services/`, `schemas/`).

### Fixed
- Allineamento shape API con i JSON demo del frontend → nessun breaking change.

---

## [0.1.1] – 2025-08-20
### Added
- Setup iniziale backend con Fastify + Prisma.
- Endpoints base per sfide (mock JSON).
- Healthcheck `/api/health` per test deploy.
- PM2 + Nginx reverse proxy configurati su `api.helplab.space`.

---