// src/utils/authz.ts
import { prisma } from '../db/client.js'

export async function requireAdmin(req: any, reply: any) {
  const auth = req.headers?.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return reply.code(401).send({ error: 'unauthorized' })

  try {
    const { verifyAccessToken } = await import('./jwt.js')
    const payload = verifyAccessToken(token) as any
    const userId = BigInt(String(payload?.sub))
    const user = await prisma.users.findFirst({
      where: { id: userId as any },
      select: { id: true, role: true, email: true }
    })
    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: 'forbidden' })
    }
    req.user = { id: user.id, email: user.email, role: user.role }
  } catch {
    return reply.code(401).send({ error: 'unauthorized' })
  }
}
