import { z } from 'zod'
export const waitlistSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  interests: z.union([z.array(z.string()), z.string()]).optional(),
  newsletter: z.boolean().optional().default(false)
})
