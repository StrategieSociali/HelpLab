// src/routes/v1/auth.ts
/**
 * Sicurezza:
 * - FIX 3 (mar 2026): protezione timing attack sul login.
 *   L'hash Argon2 viene eseguito anche quando l'utente non esiste,
 *   usando un hash dummy pre-calcolato all'avvio del modulo.
 *
 * - FIX 5 (mar 2026): blocklist refresh token.
 *   Al logout l'hash SHA-256 del refresh token viene salvato in revoked_tokens.
 *   Al refresh si verifica che l'hash non sia in blocklist prima di accettare il token.
 *   I record scaduti (expires_at < now) vengono eliminati inline al refresh (no cron).
 *   Il token in chiaro non viene mai salvato nel DB.
 */
import { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import { registerSchema, loginSchema } from '../../schemas/authSchemas.js'
import { prisma } from '../../db/client.js'
import argon2 from 'argon2'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js'
import { requireAuth } from '../../utils/requireAuth.js'

const COOKIE_NAME   = process.env.COOKIE_NAME   || 'helplab_refresh'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '.helplab.space'

// Durata refresh token in secondi — deve corrispondere a signRefreshToken
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600  // 7 giorni


// ================================
// FIX 3 — Hash dummy per protezione timing attack
// ================================
const DUMMY_PASSWORD = 'dummy_password_timing_protection_helplab'
let dummyHash: string

async function initDummyHash() {
  dummyHash = await argon2.hash(DUMMY_PASSWORD, { type: argon2.argon2id })
}

initDummyHash().catch(err => {
  console.error('[FATAL] Impossibile inizializzare dummy hash per timing protection:', err)
  process.exit(1)
})


// ================================
// FIX 5 — Utility blocklist refresh token
// ================================

/**
 * Calcola l'hash SHA-256 di un token (stringa hex, 64 caratteri).
 * Il token in chiaro non viene mai salvato nel DB.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Revoca un refresh token inserendo il suo hash nella blocklist.
 * expires_at = adesso + TTL del token, così sappiamo quando il record
 * è eliminabile senza dover decodificare il JWT.
 */
async function revokeToken(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)

  // upsert: se il token è già revocato (doppio logout), non crasha
  await (prisma as any).revoked_tokens.upsert({
    where:  { token_hash: tokenHash },
    update: {},  // niente da aggiornare se esiste già
    create: { token_hash: tokenHash, expires_at: expiresAt }
  })
}

/**
 * Controlla se un refresh token è stato revocato.
 * Contestualmente elimina i record scaduti (pulizia inline, no cron).
 */
async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = hashToken(token)
  const now       = new Date()

  // Pulizia inline: elimina record scaduti.
  // deleteMany non crasha se non trova nulla.
  // Fire-and-forget: non blocchiamo il refresh per aspettare la pulizia.
  ;(prisma as any).revoked_tokens.deleteMany({
    where: { expires_at: { lt: now } }
  }).catch((err: unknown) => {
    // Non fatale: la pulizia fallisce silenziosamente, i record scaduti
    // saranno eliminati al prossimo refresh. Nessun impatto sulla sicurezza.
    console.warn('[WARN] Pulizia revoked_tokens fallita:', err)
  })

  const revoked = await (prisma as any).revoked_tokens.findUnique({
    where: { token_hash: tokenHash }
  })

  return revoked !== null
}


export async function authV1Routes(app: FastifyInstance) {

  // ================================
  // POST /auth/register
  // ================================
  app.post('/register', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Crea un nuovo utente',
      body: { type: 'object' },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id:       { type: 'number' },
                email:    { anyOf: [{ type: 'string' }, { type: 'null' }] },
                username: { type: 'string' },
                role:     { anyOf: [{ type: 'string' }, { type: 'null' }] }
              }
            }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parse = registerSchema.safeParse((req as any).body)
    if (!parse.success) return reply.code(400).send({ error: 'invalid body' })
    const { email, password, username, nickname } = parse.data

    const existing = await prisma.users.findFirst({ where: { email } as any })
    if (existing) return reply.code(409).send({ error: 'email already in use' })

    const existingNickname = await prisma.users.findFirst({ where: { nickname } as any })
    if (existingNickname) return reply.code(409).send({ error: 'nickname already in use' })

    const hash = await argon2.hash(password, { type: argon2.argon2id })
    const user = await prisma.users.create({
      data: {
        email,
        password_hash: hash,
        username: username ?? email.split('@')[0].toLowerCase(),
        nickname
      } as any,
      select: { id: true, email: true, username: true, role: true, nickname: true }
    })

    return reply.code(201).send({
      user: {
        id:       Number(user.id),
        email:    user.email    ?? null,
        username: user.username,
        nickname: user.nickname,
        role:     user.role     ?? 'user'
      }
    })
  })


  // ================================
  // POST /auth/login
  // ================================
  app.post('/login', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Login utente',
      body: { type: 'object' },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id:       { type: 'number' },
                email:    { anyOf: [{ type: 'string' }, { type: 'null' }] },
                username: { type: 'string' },
                role:     { anyOf: [{ type: 'string' }, { type: 'null' }] }
              }
            },
            accessToken: { type: 'string' }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parse = loginSchema.safeParse((req as any).body)
    if (!parse.success) return reply.code(400).send({ error: 'invalid body' })
    const { email, password } = parse.data

    const user = await prisma.users.findFirst({
      where:  { email } as any,
      select: { id: true, email: true, username: true, password_hash: true, role: true }
    })

    // FIX 3 — Timing attack protection
    if (!user || !user.password_hash) {
      await argon2.verify(dummyHash, password)
      return reply.code(401).send({ error: 'invalid credentials' })
    }

    const ok = await argon2.verify(user.password_hash, password)
    if (!ok) return reply.code(401).send({ error: 'invalid credentials' })

    const emailStr     = user.email ?? ''
    const accessToken  = signAccessToken(user.id as unknown as bigint, emailStr)
    const refreshToken = signRefreshToken(user.id as unknown as bigint, emailStr)

    reply.setCookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure:   true,
      sameSite: 'none',
      path:     '/',
      domain:   COOKIE_DOMAIN,
      maxAge:   REFRESH_TOKEN_TTL_SECONDS
    })

    return reply.send({
      user: {
        id:       Number(user.id),
        email:    user.email ?? null,
        username: user.username,
        role:     user.role  ?? 'user'
      },
      accessToken
    })
  })


  // ================================
  // POST /auth/refresh
  // FIX 5: verifica blocklist prima di emettere nuovo access token
  // ================================
  app.post('/refresh', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Rinnova access token da cookie httpOnly' }
  }, async (req, reply) => {
    const token = (req as any).cookies?.[COOKIE_NAME]
    if (!token) return reply.code(401).send({ error: 'missing refresh' })

    // FIX 5 — Controlla blocklist prima di verificare la firma
    const revoked = await isTokenRevoked(token)
    if (revoked) return reply.code(401).send({ error: 'invalid refresh' })

    try {
      const payload    = verifyRefreshToken(token)
      const accessToken = signAccessToken(BigInt(payload.sub), payload.email)
      return reply.send({ accessToken })
    } catch {
      return reply.code(401).send({ error: 'invalid refresh' })
    }
  })


  // ================================
  // POST /auth/logout
  // FIX 5: revoca il refresh token nella blocklist prima di cancellare il cookie
  // ================================
  app.post('/logout', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Logout: cancella cookie di refresh' }
  }, async (req, reply) => {
    const token = (req as any).cookies?.[COOKIE_NAME]

    // FIX 5 — Revoca il token se presente nel cookie
    // Se il cookie non c'è (logout già fatto o cookie scaduto), procediamo
    // comunque senza errore — il comportamento esterno è identico.
    if (token) {
      try {
        await revokeToken(token)
      } catch (err) {
        // Non fatale: il cookie viene comunque cancellato.
        // In caso di errore DB il token scade naturalmente tra 7 giorni.
        req.log.warn({ err }, 'Impossibile revocare refresh token — il token scadrà naturalmente')
      }
    }

    reply.clearCookie(COOKIE_NAME, {
      path:     '/',
      domain:   COOKIE_DOMAIN || undefined,
      secure:   true,
      httpOnly: true,
      sameSite: 'none'
    })
    return reply.code(200).send({ ok: true })
  })


  // ================================
  // GET /auth/me
  // ================================
  app.get('/me', {
    preHandler: requireAuth(),
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Profilo utente (richiede Bearer)',
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id:       { type: 'number' },
                email:    { anyOf: [{ type: 'string' }, { type: 'null' }] },
                username: { type: 'string' },
                nickname: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                role:     { anyOf: [{ type: 'string' }, { type: 'null' }] }
              }
            }
          }
        },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const user = await prisma.users.findUnique({
      where:  { id: BigInt(String(req.user.id)) },
      select: { id: true, email: true, username: true, nickname: true, role: true }
    })
    if (!user) return reply.code(401).send({ error: 'invalid token' })

    return reply.send({
      user: {
        id:       Number(user.id),
        email:    user.email    ?? null,
        username: user.username,
        nickname: user.nickname ?? null,
        role:     user.role     ?? 'user'
      }
    })
  })


  // ================================
  // GET /auth/dashboard
  // ================================
  app.get('/dashboard', {
    preHandler: requireAuth(),
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Dashboard personale utente loggato',
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id:       { type: 'number' },
                username: { type: 'string' },
                email:    { type: 'string' },
                nickname: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                role:     { anyOf: [{ type: 'string' }, { type: 'null' }] }
              }
            },
            totalPoints:   { type: 'number' },
            totalVerified: { type: 'number' },
            submissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id:          { type: 'number' },
                  challengeId: { type: 'number' },
                  status:      { type: 'string' },
                  visibility:  { type: 'string' },
                  activity:    { type: 'string' },
                  createdAt:   { type: 'string' },
                  reviewedAt:  { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  points:      { anyOf: [{ type: 'number' }, { type: 'null' }] }
                }
              }
            },
            scores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  challengeId:    { type: 'number' },
                  score:          { type: 'number' },
                  verified_tasks: { type: 'number' },
                  last_event_at:  { type: 'string' }
                }
              }
            }
          }
        },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req: any, reply) => {
    const userId = BigInt(String(req.user.id))

    const user = await prisma.users.findUnique({
      where:  { id: userId },
      select: { id: true, username: true, email: true, nickname: true, role: true }
    })
    if (!user) return reply.code(401).send({ error: 'invalid token' })

    const submissions = await prisma.challenge_submissions.findMany({
      where:  { user_id: userId },
      select: {
        id: true, challenge_id: true, status: true, visibility: true,
        activity_description: true, created_at: true, reviewed_at: true, points_awarded: true
      },
      orderBy: { created_at: 'desc' }
    })

    const scores = await prisma.challenge_scores.findMany({
      where:  { user_id: userId },
      select: { challenge_id: true, score: true, verified_tasks_count: true, last_event_at: true }
    })

    const totalPoints   = scores.reduce((sum, s) => sum + Number(s.score), 0)
    const totalVerified = scores.reduce((sum, s) => sum + Number(s.verified_tasks_count), 0)

    return reply.send({
      user: {
        id:       Number(user.id),
        email:    user.email,
        username: user.username,
        nickname: user.nickname ?? null,
        role:     user.role     ?? 'user'
      },
      totalPoints,
      totalVerified,
      submissions: submissions.map(s => ({
        id:          Number(s.id),
        challengeId: Number(s.challenge_id),
        status:      s.status,
        visibility:  s.visibility,
        activity:    s.activity_description ?? '',
        createdAt:   s.created_at.toISOString(),
        reviewedAt:  s.reviewed_at?.toISOString() ?? null,
        points:      s.points_awarded ?? null
      })),
      scores: scores.map(s => ({
        challengeId:    Number(s.challenge_id),
        score:          Number(s.score),
        verified_tasks: Number(s.verified_tasks_count),
        last_event_at:  s.last_event_at?.toISOString() ?? null
      }))
    })
  })
}
