import { z } from 'zod'

export const createChallengeSchema = z.object({
  title: z.string().min(3),
  type: z.string().min(1),
  location: z.string().optional().default(''),
  rules: z.string().optional().default(''),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  budget: z.object({ amount: z.number().nonnegative().default(0), currency: z.string().min(1).default('EUR') }).optional(),
  sponsor: z.object({ name: z.string().min(2) }).optional(),
  judge: z.object({ name: z.string().min(2) }).optional(), // per ora non lo usiamo, settiamo il creator come judge
  target: z.any().optional()
})
