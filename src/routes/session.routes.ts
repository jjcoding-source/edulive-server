import { Router }    from 'express'
import {
  createSession, getAllSessions, getSessionById,
  getUpcomingSessions, goLive, endSession,
  joinSession, getSessionByRoomId,
  createSessionValidation,
} from '../controllers/session.controller'
import { protect, restrictTo } from '../middleware/auth.middleware'
import { validate }            from '../middleware/validate.middleware'

const router = Router()

router.use(protect)

router.get('/',                   getAllSessions)
router.get('/upcoming',           getUpcomingSessions)
router.get('/room/:roomId',       getSessionByRoomId)
router.get('/:id',                getSessionById)
router.post('/',                  createSessionValidation, validate, createSession)
router.patch('/:id/go-live',      restrictTo('tutor'), goLive)
router.patch('/:id/end',          restrictTo('tutor'), endSession)
router.post('/:id/join',          restrictTo('student'), joinSession)

export default router