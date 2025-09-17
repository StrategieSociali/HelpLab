// src/routes/auth.ts
import '@fastify/cookie'
import { FastifyInstance } from 'fastify'
import { registerSchema, loginSchema } from '../schemas/authSchemas.js'
import { prisma } from '../db/client.js'
import argon2 from 'argon2'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'

const COOKIE_NAME = process.env.COOKIE_NAME || 'helplab_refresh'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '.helplab.space'

export async function authRoutes(app: FastifyInstance) {
  // REGISTER
  app.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Crea un nuovo utente',
      description: 'Registra un utente. Richiede email e password. Username opzionale.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          username: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                username: { type: 'string' }
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
      select: { id: true, email: true, username: true }
    })

    return reply.code(201).send({
      user: { id: Number(user.id), email: user.email, username: user.username }
    })
  })

  // LOGIN
  app.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login utente (ritorna accessToken e imposta refresh cookie)',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                username: { type: 'string' }
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

    const user = await prisma.users.findFirst({ where: { email } as any })
    if (!user || !user.password_hash) return reply.code(401).send({ error: 'invalid credentials' })

    const ok = await argon2.verify(user.password_hash, password)
    if (!ok) return reply.code(401).send({ error: 'invalid credentials' })

    const accessToken = signAccessToken(user.id as unknown as bigint, email)
    const refreshToken = signRefreshToken(user.id as unknown as bigint, email)

    // set cookie refresh httpOnly
    reply.setCookie(COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      domain: COOKIE_DOMAIN,
      maxAge: 7 * 24 * 3600
    })

    return reply.send({
      user: { id: Number(user.id), email: user.email, username: user.username },
      accessToken
    })
  })

  // REFRESH (usa cookie)
  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Rilascia un nuovo accessToken usando il refresh cookie',
      security: [{ refreshCookie: [] }],
      response: {
        200: { type: 'object', properties: { accessToken: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const token = (req.cookies || {})[COOKIE_NAME]
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
    schema: {
      tags: ['Auth'],
      summary: 'Logout: cancella il refresh cookie',
      security: [{ refreshCookie: [] }],
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } }
      }
    }
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
}
