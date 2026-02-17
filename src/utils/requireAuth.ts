// src/utils/requireAuth.ts
/**
 * Middleware di autenticazione e autorizzazione.
 *
 * - Verifica JWT Bearer
 * - Carica l'utente dal DB
 * - (Opzionale) verifica ruolo richiesto
 *
 * Regola:
 * - admin è sempre super‑ruolo
 */

import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../db/client.js'
import { verifyAccessToken } from './jwt.js'
import { users_role } from '@prisma/client'


type Role = users_role

// Middleware di autenticazione e autorizzazione.
export function requireAuth(role?: users_role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = String(req.headers?.authorization || '')
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

      if (!token) {
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'Missing bearer token'
        })
      }

      // 🔐 Verifica JWT
      const payload = verifyAccessToken(token) as any
      if (!payload?.sub) {
        return reply.code(401).send({
          error: 'invalid_token',
          message: 'Invalid JWT payload'
        })
      }

      const userId = BigInt(payload.sub)

      // 👤 Carica utente
      const user = await prisma.users.findUnique({
        where: { id: userId as any },
        select: {
          id: true,
          email: true,
          role: true
        }
      })

      if (!user) {
        return reply.code(401).send({
          error: 'unauthorized',
          message: 'User not found'
        })
      }

      const userRole: Role = user.role ?? users_role.user

      // 🛑 Controllo ruolo
      if (role && userRole !== role && userRole !== users_role.admin) {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'Insufficient permissions'
        })
      }

      // ✅ Attacca user al request
      ;(req as any).user = {
        id: user.id,
        email: user.email,
        role: userRole
      }

    } catch (err) {
      req.log.error({ err }, 'requireAuth error')
      return reply.code(401).send({
        error: 'invalid_token',
        message: 'Auth verification failed'
      })
    }
  }
}
/**
 * Middleware opzionale: se il token è presente e valido, popola req.user.
 * Se assente o invalido, prosegue senza errore (req.user resta undefined).
 */
export function optionalAuth() {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    try {
      const auth = String(req.headers?.authorization || '')
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!token) return

      const payload = verifyAccessToken(token) as any
      if (!payload?.sub) return

      const userId = BigInt(payload.sub)
      const user = await prisma.users.findUnique({
        where: { id: userId as any },
        select: { id: true, email: true, role: true }
      })
      if (!user) return

      ;(req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role ?? users_role.user
      }
    } catch {
      // Token invalido/scaduto → prosegui come anonimo
    }
  }
}
