import { Response, NextFunction } from 'express'
import { body }       from 'express-validator'
import User           from '../models/User.model'
import { signToken }  from '../utils/jwt'
import { sendSuccess } from '../utils/ApiResponse'
import { ApiError }   from '../utils/ApiError'
import { AuthRequest } from '../types'

// Validation rules 
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'tutor']).withMessage('Role must be student or tutor'),
]

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
]

// Helpers 
const sanitizeUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : { ...user }
  delete obj.password
  return obj
}

const sendTokenResponse = (user: any, res: Response, statusCode: number, message: string) => {
  const token = signToken(user)
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, 
  })
  sendSuccess(res, { user: sanitizeUser(user), token }, message, statusCode)
}

export const register = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password, role, grade, subjects } = req.body

    const exists = await User.findOne({ email })
    if (exists) throw new ApiError(409, 'Email already registered')

    const user = await User.create({ name, email, password, role, grade, subjects })
    sendTokenResponse(user, res, 201, 'Account created successfully')
  } catch (err) {
    next(err)
  }
}

export const login = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user) throw new ApiError(401, 'Invalid email or password')

    const match = await user.comparePassword(password)
    if (!match) throw new ApiError(401, 'Invalid email or password')

    if (!user.isActive) throw new ApiError(401, 'Account deactivated. Contact support.')

    sendTokenResponse(user, res, 200, 'Login successful')
  } catch (err) {
    next(err)
  }
}

export const getMe = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id)
    sendSuccess(res, sanitizeUser(user!), 'User fetched')
  } catch (err) {
    next(err)
  }
}

export const logout = (
  _req: AuthRequest,
  res:  Response,
): void => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true })
  sendSuccess(res, null, 'Logged out successfully')
}

export const updateProfile = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const allowed = ['name', 'bio', 'grade', 'subjects', 'avatar']
    const updates: any = {}
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: updates },
      { new: true, runValidators: true },
    )
    sendSuccess(res, sanitizeUser(user!), 'Profile updated')
  } catch (err) {
    next(err)
  }
}