// src/routes/auth.ts
import { FastifyInstance } from 'fastify'
import { registerSchema, loginSchema } from '../schemas/authSchemas.js'
import { prisma } from '../db/client.js'
import argon2 from 'argon2'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js'

const COOKIE_NAME = process.env.COOKIE_NAME || 'helplab_refresh'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '.helplab.space'

export async function authRoutes(app: FastifyInstance) {
  // REGISTER
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
                id: { type: 'number' },
                email: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                username: { type: 'string' },
                role: { anyOf: [{ type: 'string' }, { type: 'null' }] }
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
    const { email, password, username } = parse.data

    const existing = await prisma.users.findFirst({ where: { email } as any })
    if (existing) return reply.code(409).send({ error: 'email already in use' })

    const hash = await argon2.hash(password, { type: argon2.argon2id })
    const user = await prisma.users.create({
      data: {
        email,
        password_hash: hash,
        username: username ?? email.split('@')[0].toLowerCase()
      } as any,
      select: { id: true, email: true, username: true, role: true }
    })

    return reply.code(201).send({
      user: {
        id: Number(user.id),
        email: user.email ?? null,
        username: user.username,
        role: user.role ?? 'user'
      }
    })
  })

  // LOGIN
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
                id: { type: 'number' },
                email: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                username: { type: 'string' },
                role: { anyOf: [{ type: 'string' }, { type: 'null' }] }
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
      where: { email } as any,
      select: { id: true, email: true, username: true, password_hash: true, role: true }
    })
    if (!user || !user.password_hash) return reply.code(401).send({ error: 'invalid credentials' })

    const ok = await argon2.verify(user.password_hash, password)
    if (!ok) return reply.code(401).send({ error: 'invalid credentials' })

    const emailStr = user.email ?? '' // jwt vuole string
    const accessToken = signAccessToken(user.id as unknown as bigint, emailStr)
    const refreshToken = signRefreshToken(user.id as unknown as bigint, emailStr)

    reply.setCookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      domain: COOKIE_DOMAIN,
      maxAge: 7 * 24 * 3600
    })

    return reply.send({
      user: {
        id: Number(user.id),
        email: user.email ?? null,
        username: user.username,
        role: user.role ?? 'user'
      },
      accessToken
    })
  })

  // REFRESH (usa cookie httpOnly)
  app.post('/refresh', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Rinnova access token da cookie httpOnly' }
  }, async (req, reply) => {
    const token = (req as any).cookies?.[COOKIE_NAME]
    if (!token) return reply.code(401).send({ error: 'missing refresh' })
    try {
      const payload = verifyRefreshToken(token)
      const accessToken = signAccessToken(BigInt(payload.sub), payload.email)
      return reply.send({ accessToken })
    } catch {
      return reply.code(401).send({ error: 'invalid refresh' })
    }
  })

  // LOGOUT
  app.post('/logout', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Logout: cancella cookie di refresh' }
  }, async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, {
      path: '/',
      domain: COOKIE_DOMAIN || undefined,
      secure: true,
      httpOnly: true,
      sameSite: 'none'
    })
    return reply.code(200).send({ ok: true })
  })

  // ME (profilo + role) — per riempire AuthContext al reload
  app.get('/me', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Profilo utente (richiede Bearer)' }
  }, async (req, reply) => {
    const auth = (req.headers?.authorization || '').toString()
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return reply.code(401).send({ error: 'missing token' })
    try {
      const payload = verifyAccessToken(token) as any
      const user = await prisma.users.findUnique({
        where: { id: BigInt(String(payload.sub)) } as any,
        select: { id: true, email: true, username: true, role: true }
      })
      if (!user) return reply.code(401).send({ error: 'invalid token' })
      return reply.send({
        user: {
          id: Number(user.id),
          email: user.email ?? null,
          username: user.username,
          role: user.role ?? 'user'
        }
      })
    } catch {
      return reply.code(401).send({ error: 'invalid token' })
    }
  })
}
