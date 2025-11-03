// src/utils/requireAuth.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../db/client.js'
import { verifyAccessToken } from './jwt.js'

/**
 * Middleware Fastify per richiedere autenticazione JWT e, opzionalmente, un ruolo specifico.
 *
 * @param role Facoltativo: "admin" o "judge" per restringere l’accesso
 * @returns funzione Fastify preHandler
 */
export function requireAuth(role?: 'admin' | 'judge') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = String(req.headers?.authorization || '')
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

      if (!token) {
        return reply.code(401).send({ error: 'unauthorized', message: 'Missing bearer token' })
      }

      // Verifica firma JWT
      const payload = verifyAccessToken(token) as any
      if (!payload?.sub) {
        return reply.code(401).send({ error: 'invalid_token' })
      }

      // Recupera utente da DB
      const user = await prisma.users.findUnique({
        where: { id: BigInt(payload.sub) as any },
        select: { id: true, email: true, role: true }
      })

      if (!user) {
        return reply.code(401).send({ error: 'unauthorized', message: 'User not found' })
      }

      // Controllo ruolo
      if (role && user.role !== role && user.role !== 'admin') {
        return reply.code(403).send({ error: 'forbidden', message: 'Insufficient permissions' })
      }

      // Attacca utente al request object
      ;(req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role ?? 'user'
      }

    } catch (err: any) {
      req.log.error({ err }, 'requireAuth error')
      return reply.code(401).send({ error: 'invalid_token', message: 'Auth verification failed' })
    }
  }
}
