import { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken } from './jwt.js'
import { prisma } from '../db/client.js'

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const auth = (req.headers?.authorization ?? '') as string
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return reply.code(401).send({ error: 'unauthorized' })

  try {
    const payload = verifyAccessToken(token) as any
    ;(req as any).user = { id: BigInt(String(payload.sub)), email: payload.email }
  } catch {
    return reply.code(401).send({ error: 'unauthorized' })
  }
}

export async function adminGuard(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user as { id: bigint } | undefined
  if (!user?.id) return reply.code(401).send({ error: 'unauthorized' })

  const row = await prisma.users.findUnique({
    where: { id: user.id as any },
    select: { role: true },
  })
  if (!row || row.role !== 'admin') {
    return reply.code(403).send({ error: 'forbidden' })
  }
}
