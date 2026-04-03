import { Router }    from 'express'
import {
  register, login, getMe, logout, updateProfile,
  registerValidation, loginValidation,
} from '../controllers/auth.controller'
import { protect }   from '../middleware/auth.middleware'
import { validate }  from '../middleware/validate.middleware'

const router = Router()

router.post('/register', registerValidation, validate, register)
router.post('/login',    loginValidation,    validate, login)
router.post('/logout',   protect,                      logout)
router.get('/me',        protect,                      getMe)
router.patch('/me',      protect,                      updateProfile)

export default router