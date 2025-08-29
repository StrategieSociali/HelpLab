import { prisma } from '../db/client.js'

export async function saveWaitlist(
  name: string, email: string,
  interests: string[] | string | undefined,
  newsletter: boolean,
  ip: string | undefined,
  ua: string | undefined
) {
  await prisma.form_submissions.create({
    data: {
      name,
      email,
      interests_json: Array.isArray(interests) ? interests : (interests ? [interests] : null),
      newsletter: newsletter ? 1 : 0,
      ip: ip ?? null,
      ua: ua ?? null
    } as any
  })
}
