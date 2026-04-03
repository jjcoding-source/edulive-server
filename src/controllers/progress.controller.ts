import { Response, NextFunction } from 'express'
import { body }         from 'express-validator'
import Progress          from '../models/Progress.model'
import Session           from '../models/Session.model'
import Attempt           from '../models/Attempt.model'
import { sendSuccess }   from '../utils/ApiResponse'
import { ApiError }      from '../utils/ApiError'
import { AuthRequest }   from '../types'
import mongoose          from 'mongoose'

const getOrCreate = async (studentId: string) => {
  let p = await Progress.findOne({
    student: new mongoose.Types.ObjectId(studentId),
  })
  if (!p) {
    p = await Progress.create({ student: new mongoose.Types.ObjectId(studentId) })
  }
  return p
}

const computeWeakAreas = (subjects: any[]) =>
  subjects
    .filter(s => s.score < 60)
    .flatMap(s =>
      s.weakTopics.length
        ? s.weakTopics.map((t: string) => ({ topic: t, score: s.score }))
        : [{ topic: s.subject, score: s.score }],
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)

export const getDashboard = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const studentId = req.user!._id.toString()
    const progress  = await getOrCreate(studentId)

    // Recent attempts for quiz avg
    const attempts = await Attempt.find({ student: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const quizAvgScore = attempts.length
      ? Math.round(
          attempts.reduce((sum, a) => sum + Math.round((a.score / a.totalMarks) * 100), 0)
          / attempts.length,
        )
      : 0

    sendSuccess(res, {
      hoursStudied:     progress.totalHoursStudied,
      classesAttended:  progress.totalClassesAttended,
      doubtsSolved:     progress.totalDoubtsSolved,
      quizAvgScore,
      weeklyHours:      progress.weeklyHours,
      subjectProgress:  progress.subjects,
      weakAreas:        computeWeakAreas(progress.subjects),
    }, 'Dashboard fetched')
  } catch (err) { next(err) }
}

export const logStudyHours = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { hours, dayIndex } = req.body as { hours: number; dayIndex: number }
    if (dayIndex < 0 || dayIndex > 6) throw new ApiError(400, 'dayIndex must be 0–6')

    const progress = await getOrCreate(req.user!._id.toString())
    progress.totalHoursStudied   += hours
    progress.weeklyHours[dayIndex] += hours
    await progress.save()
    sendSuccess(res, progress, 'Study hours logged')
  } catch (err) { next(err) }
}

export const incrementClassAttended = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const progress = await Progress.findOneAndUpdate(
      { student: req.user!._id },
      { $inc: { totalClassesAttended: 1 } },
      { new: true, upsert: true },
    )
    sendSuccess(res, progress, 'Class attendance recorded')
  } catch (err) { next(err) }
}

export const incrementDoubtSolved = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const progress = await Progress.findOneAndUpdate(
      { student: req.user!._id },
      { $inc: { totalDoubtsSolved: 1 } },
      { new: true, upsert: true },
    )
    sendSuccess(res, progress, 'Doubt solved recorded')
  } catch (err) { next(err) }
}