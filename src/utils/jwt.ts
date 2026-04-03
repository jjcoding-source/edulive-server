import jwt from 'jsonwebtoken'
import { IUser } from '../types'

const SECRET     = process.env.JWT_SECRET     || 'fallback_secret'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export const signToken = (user: IUser): string => {
  return jwt.sign(
    {
      sub:   user._id.toString(),
      email: user.email,
      role:  user.role,
      name:  user.name,
    },
    SECRET,
    { expiresIn: EXPIRES_IN } as jwt.SignOptions,
  )
}

export const verifyToken = (token: string): any => {
  return jwt.verify(token, SECRET)
}