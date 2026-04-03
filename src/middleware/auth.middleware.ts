import { Response, NextFunction } from 'express'
import { verifyToken }  from '../utils/jwt'
import User             from '../models/User.model'
import { ApiError }     from '../utils/ApiError'
import { AuthRequest }  from '../types'

export const protect = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies?.token) {
      token = req.cookies.token
    }

    if (!token) throw new ApiError(401, 'Not authenticated. Please log in.')

    const decoded = verifyToken(token) as { sub: string }

    const user = await User.findById(decoded.sub).select('+password')
    if (!user)        throw new ApiError(401, 'User no longer exists')
    if (!user.isActive) throw new ApiError(401, 'Account deactivated')

    req.user = user
    next()
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError')  next(new ApiError(401, 'Invalid token'))
    else if (err.name === 'TokenExpiredError') next(new ApiError(401, 'Token expired. Please log in again.'))
    else next(err)
  }
}

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'))
    }
    next()
  }
}