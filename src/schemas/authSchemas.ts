// src/schemas/authSchemas.ts
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).optional(),
  nickname: z.string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Il nickname può contenere solo lettere, numeri, - e _')
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
