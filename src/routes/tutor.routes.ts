import { Router } from 'express'
import {
  getAllTutors, getTutorById,
  getTutorSessions, addReview,
  reviewValidation,
} from '../controllers/tutor.controller'
import { protect, restrictTo } from '../middleware/auth.middleware'
import { validate }            from '../middleware/validate.middleware'

const router = Router()

router.use(protect)

router.get('/',                  getAllTutors)
router.get('/:id',               getTutorById)
router.get('/:id/sessions',      getTutorSessions)
router.post('/:id/review',       restrictTo('student'), reviewValidation, validate, addReview)

export default router