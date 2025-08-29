import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken'

const JWT_SECRET: Secret = process.env.JWT_SECRET as string
const REFRESH_SECRET: Secret = process.env.REFRESH_SECRET as string

// Tipizza expiresIn nel modo atteso dalle definizioni di jsonwebtoken
const ACCESS_TOKEN_TTL = (process.env.ACCESS_TOKEN_TTL || '15m') as SignOptions['expiresIn']
const REFRESH_TOKEN_TTL = (process.env.REFRESH_TOKEN_TTL || '7d') as SignOptions['expiresIn']

export function signAccessToken(userId: bigint, email: string) {
  const payload = { sub: String(userId), email }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string) {
  // Uniamo JwtPayload con i nostri campi custom
  return jwt.verify(token, JWT_SECRET) as JwtPayload & { sub: string; email: string }
}

export function signRefreshToken(userId: bigint, email: string) {
  const payload = { sub: String(userId), email }
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL })
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload & { sub: string; email: string }
}
