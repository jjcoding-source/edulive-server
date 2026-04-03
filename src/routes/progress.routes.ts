import { Router } from 'express'
import {
  getDashboard, logStudyHours,
  incrementClassAttended, incrementDoubtSolved,
} from '../controllers/progress.controller'
import { protect, restrictTo } from '../middleware/auth.middleware'

const router = Router()

router.use(protect)

router.get('/dashboard',           getDashboard)
router.post('/study-hours',        logStudyHours)
router.post('/class-attended',     incrementClassAttended)
router.post('/doubt-solved',       incrementDoubtSolved)

export default router