import express        from 'express'
import cors           from 'cors'
import helmet         from 'helmet'
import morgan         from 'morgan'
import cookieParser   from 'cookie-parser'
import authRoutes     from './routes/auth.routes'
import sessionRoutes  from './routes/session.routes'
import quizRoutes     from './routes/quiz.routes'
import progressRoutes from './routes/progress.routes'
import tutorRoutes    from './routes/tutor.routes'
import { errorHandler, notFound } from './middleware/error.middleware'

const app = express()

app.use(helmet())
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes 
app.use('/api/auth',     authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/quizzes',  quizRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/tutors',   tutorRoutes)

// Error Handling 
app.use(notFound)
app.use(errorHandler)

export default app