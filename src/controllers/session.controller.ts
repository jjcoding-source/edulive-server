import { Response, NextFunction } from 'express'
import { body, param, query } from 'express-validator'
import { v4 as uuid }   from 'uuid'
import Session           from '../models/Session.model'
import { sendSuccess }   from '../utils/ApiResponse'
import { ApiError }      from '../utils/ApiError'
import { AuthRequest }   from '../types'
import mongoose          from 'mongoose'

export const createSessionValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('durationMinutes').optional().isInt({ min: 15 }).withMessage('Min 15 minutes'),
  body('maxStudents').optional().isInt({ min: 1 }).withMessage('Must be positive'),
]

// Controllers 
export const createSession = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user!.role !== 'tutor') throw new ApiError(403, 'Only tutors can create sessions')

    const session = await Session.create({
      ...req.body,
      tutor:  req.user!._id,
      roomId: uuid(),
    })
    sendSuccess(res, session, 'Session created', 201)
  } catch (err) { next(err) }
}

export const getAllSessions = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: any = {}
    if (req.query.subject) filter.subject = req.query.subject
    if (req.query.status)  filter.status  = req.query.status

    const sessions = await Session.find(filter)
      .populate('tutor', 'name email avatar rating subjects')
      .sort({ startTime: 1 })
      .lean()

    sendSuccess(res, sessions, 'Sessions fetched')
  } catch (err) { next(err) }
}

export const getSessionById = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('tutor',    'name email avatar rating bio subjects')
      .populate('students', 'name email avatar')
      .lean()

    if (!session) throw new ApiError(404, 'Session not found')
    sendSuccess(res, session, 'Session fetched')
  } catch (err) { next(err) }
}

export const getUpcomingSessions = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!._id

    const sessions = await Session.find({
      status:    { $in: ['scheduled', 'live'] },
      $or: [
        { tutor:    userId },
        { students: userId },
      ],
    })
      .populate('tutor', 'name avatar rating')
      .sort({ startTime: 1 })
      .limit(10)
      .lean()

    sendSuccess(res, sessions, 'Upcoming sessions fetched')
  } catch (err) { next(err) }
}

export const goLive = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) throw new ApiError(404, 'Session not found')
    if (session.tutor.toString() !== req.user!._id.toString())
      throw new ApiError(403, 'Only the session tutor can go live')

    session.status    = 'live'
    session.startTime = new Date()
    await session.save()
    sendSuccess(res, session, 'Session is now live')
  } catch (err) { next(err) }
}

export const endSession = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) throw new ApiError(404, 'Session not found')
    if (session.tutor.toString() !== req.user!._id.toString())
      throw new ApiError(403, 'Only the session tutor can end the session')

    session.status  = 'ended'
    session.endTime = new Date()
    await session.save()
    sendSuccess(res, session, 'Session ended')
  } catch (err) { next(err) }
}

export const joinSession = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) throw new ApiError(404, 'Session not found')
    if (session.status === 'ended') throw new ApiError(400, 'Session has already ended')

    const studentId  = req.user!._id
    const alreadyIn  = session.students.some(s => s.toString() === studentId.toString())

    if (!alreadyIn) {
      if (session.maxStudents && session.students.length >= session.maxStudents)
        throw new ApiError(400, 'Session is full')
      session.students.push(studentId)
      await session.save()
    }

    sendSuccess(res, { roomId: session.roomId }, 'Joined session')
  } catch (err) { next(err) }
}

export const getSessionByRoomId = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await Session.findOne({ roomId: req.params.roomId })
      .populate('tutor', 'name avatar rating')
      .lean()

    if (!session) throw new ApiError(404, 'Room not found')
    sendSuccess(res, session, 'Session fetched')
  } catch (err) { next(err) }
}