import { Router } from 'express'
import {
  createQuiz, getAllQuizzes, getQuizById,
  submitQuiz, getMyAttempts,
  createQuizValidation, submitQuizValidation,
} from '../controllers/quiz.controller'
import { protect, restrictTo } from '../middleware/auth.middleware'
import { validate }            from '../middleware/validate.middleware'

const router = Router()

router.use(protect)

router.get('/',              getAllQuizzes)
router.get('/my-attempts',   getMyAttempts)
router.get('/:id',           getQuizById)
router.post('/',             restrictTo('tutor'), createQuizValidation, validate, createQuiz)
router.post('/:id/submit',   submitQuizValidation, validate, submitQuiz)

export default router