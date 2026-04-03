import { Response, NextFunction } from 'express'
import { body }       from 'express-validator'
import Quiz            from '../models/Quiz.model'
import Attempt         from '../models/Attempt.model'
import Progress        from '../models/Progress.model'
import { sendSuccess } from '../utils/ApiResponse'
import { ApiError }    from '../utils/ApiError'
import { AuthRequest } from '../types'
import mongoose        from 'mongoose'

// ── Validation ────────────────────────────────────────────────────
export const createQuizValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('subject').trim().notEmpty().withMessage('Subject required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question required'),
  body('questions.*.text').notEmpty().withMessage('Question text required'),
  body('questions.*.type').isIn(['mcq', 'subjective']).withMessage('Invalid type'),
  body('duration').optional().isInt({ min: 5 }).withMessage('Min 5 minutes'),
]

export const submitQuizValidation = [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('answers.*.questionId').notEmpty().withMessage('Question ID required'),
  body('answers.*.answer').exists().withMessage('Answer required'),
]

export const createQuiz = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user!.role !== 'tutor') throw new ApiError(403, 'Only tutors can create quizzes')

    const quiz = await Quiz.create({
      ...req.body,
      createdBy: req.user!._id,
    })
    sendSuccess(res, quiz, 'Quiz created', 201)
  } catch (err) { next(err) }
}

export const getAllQuizzes = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: any = { isActive: true }
    if (req.query.subject) filter.subject = req.query.subject

    const projection = req.user!.role === 'student'
      ? '-questions.correctOption -questions.explanation'
      : ''

    const quizzes = await Quiz.find(filter).select(projection).lean()
    sendSuccess(res, quizzes, 'Quizzes fetched')
  } catch (err) { next(err) }
}

export const getQuizById = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projection = req.user!.role === 'student'
      ? '-questions.correctOption -questions.explanation'
      : ''

    const quiz = await Quiz.findById(req.params.id).select(projection).lean()
    if (!quiz) throw new ApiError(404, 'Quiz not found')
    sendSuccess(res, quiz, 'Quiz fetched')
  } catch (err) { next(err) }
}

export const submitQuiz = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id)
    if (!quiz) throw new ApiError(404, 'Quiz not found')

    const { answers } = req.body as {
      answers: { questionId: string; answer: string; flagged?: boolean }[]
    }

    let score      = 0
    const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0)

    const gradedAnswers = answers.map(a => {
      const question = quiz.questions.find(
        q => q._id.toString() === a.questionId,
      )
      if (!question) return { ...a, isCorrect: false }

      const isCorrect = question.correctOption === a.answer
      if (isCorrect)              score += question.marks
      else if (a.answer)          score -= question.negativeMarks ?? 0

      return { ...a, isCorrect }
    })

    score = Math.max(0, score)

    const attempt = await Attempt.create({
      quiz:        quiz._id,
      student:     req.user!._id,
      answers:     gradedAnswers,
      score,
      totalMarks,
      completedAt: new Date(),
    })

    await updateProgressAfterQuiz(
      req.user!._id.toString(),
      quiz.subject,
      score,
      totalMarks,
    )

    sendSuccess(res, {
      attemptId:  attempt._id,
      score,
      totalMarks,
      percentage: Math.round((score / totalMarks) * 100),
      answers:    gradedAnswers,
    }, 'Quiz submitted')
  } catch (err) { next(err) }
}

export const getMyAttempts = async (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const attempts = await Attempt.find({ student: req.user!._id })
      .populate('quiz', 'title subject duration')
      .sort({ createdAt: -1 })
      .lean()

    sendSuccess(res, attempts, 'Attempts fetched')
  } catch (err) { next(err) }
}

const updateProgressAfterQuiz = async (
  studentId: string,
  subject:   string,
  score:     number,
  total:     number,
) => {
  const pct      = Math.round((score / total) * 100)
  let   progress = await Progress.findOne({
    student: new mongoose.Types.ObjectId(studentId),
  })

  if (!progress) {
    progress = new Progress({ student: new mongoose.Types.ObjectId(studentId) })
  }

  const subIdx = progress.subjects.findIndex(s => s.subject === subject)
  if (subIdx >= 0) {
    const s   = progress.subjects[subIdx]
    s.score   = Math.round((s.score * s.totalQuizzes + pct) / (s.totalQuizzes + 1))
    s.totalQuizzes += 1
  } else {
    progress.subjects.push({
      subject,
      score:        pct,
      totalQuizzes: 1,
      hoursStudied: 0,
      weakTopics:   [],
    })
  }

  await progress.save()
}