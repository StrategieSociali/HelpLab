import { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken } from './jwt.js'

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = req.headers.authorization || ''
    const [, token] = auth.split(' ')
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    const payload = verifyAccessToken(token)
    ;(req as any).userId = BigInt(payload.sub)
  } catch {
    return reply.code(401).send({ error: 'unauthorized' })
  }
}
