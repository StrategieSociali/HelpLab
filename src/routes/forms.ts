import { FastifyInstance } from 'fastify'
import { waitlistSchema } from '../schemas/formSchemas.js'
import { saveWaitlist } from '../services/formsService.js'

export async function formsRoutes(app: FastifyInstance) {
  app.post('/waitlist', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parse = waitlistSchema.safeParse((req as any).body)
    if (!parse.success) return reply.code(400).send({ error: 'invalid body' })
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress
    const ua = req.headers['user-agent']
    const { name, email, interests, newsletter = false } = parse.data
    await saveWaitlist(name, email, interests, !!newsletter, ip, ua)
    return reply.send({ ok: true })
  })
}
