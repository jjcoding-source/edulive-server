import { Response, NextFunction } from 'express'
import { body }       from 'express-validator'
import User            from '../models/User.model'
import Session         from '../models/Session.model'
import { sendSuccess } from '../utils/ApiResponse'
import { ApiError }    from '../utils/ApiError'
import { AuthRequest } from '../types'

export const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('text').trim().notEmpty().withMessage('Review text required'),
]

export const getAllTutors = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: any = { role: 'tutor', isActive: true }
    if (req.query.subject) {
      filter.subjects = { $in: [req.query.subject] }
    }

    const sort: any = {}
    if (req.query.sort === 'rating')   sort.rating        = -1
    if (req.query.sort === 'students') sort.totalRatings  = -1
    else                               sort.rating        = -1

    const tutors = await User.find(filter)
      .select('name email avatar subjects bio rating totalRatings grade')
      .sort(sort)
      .lean()

    sendSuccess(res, tutors, 'Tutors fetched')
  } catch (err) { next(err) }
}

export const getTutorById = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor', isActive: true })
      .select('name email avatar subjects bio rating totalRatings createdAt')
      .lean()

    if (!tutor) throw new ApiError(404, 'Tutor not found')

    const sessionCount = await Session.countDocuments({
      tutor:  req.params.id,
      status: { $in: ['scheduled', 'live'] },
    })

    sendSuccess(res, { ...tutor, upcomingSessions: sessionCount }, 'Tutor fetched')
  } catch (err) { next(err) }
}

export const getTutorSessions = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessions = await Session.find({
      tutor:  req.params.id,
      status: { $in: ['scheduled', 'live'] },
    })
      .select('title subject startTime status roomId durationMinutes maxStudents')
      .sort({ startTime: 1 })
      .lean()

    sendSuccess(res, sessions, 'Tutor sessions fetched')
  } catch (err) { next(err) }
}

export const addReview = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor' })
    if (!tutor) throw new ApiError(404, 'Tutor not found')
    if (req.params.id === req.user!._id.toString())
      throw new ApiError(400, 'You cannot review yourself')

    const { rating } = req.body as { rating: number; text: string }

    const newRating = tutor.totalRatings === 0
      ? rating
      : (tutor.rating * tutor.totalRatings + rating) / (tutor.totalRatings + 1)

    tutor.rating       = Math.round(newRating * 10) / 10
    tutor.totalRatings += 1
    await tutor.save()

    sendSuccess(res, { rating: tutor.rating, totalRatings: tutor.totalRatings }, 'Review added')
  } catch (err) { next(err) }
}