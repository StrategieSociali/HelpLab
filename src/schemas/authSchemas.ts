import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
