import { Request } from 'express'
import { Document, Types } from 'mongoose'

export type Role = 'student' | 'tutor' | 'admin'

export interface IUser extends Document {
  _id:           Types.ObjectId
  name:          string
  email:         string
  password:      string
  role:          Role
  avatar?:       string
  grade?:        string
  subjects:      string[]
  bio?:          string
  rating:        number
  totalRatings:  number
  isActive:      boolean
  createdAt:     Date
  updatedAt:     Date
  comparePassword(candidate: string): Promise<boolean>
}

export type SessionStatus = 'scheduled' | 'live' | 'ended'

export interface ISession extends Document {
  _id:             Types.ObjectId
  title:           string
  subject:         string
  tutor:           Types.ObjectId | IUser
  startTime:       Date
  endTime?:        Date
  status:          SessionStatus
  roomId:          string
  students:        Types.ObjectId[]
  maxStudents:     number
  description?:    string
  durationMinutes: number
  createdAt:       Date
}

export interface IOption {
  id:   string
  text: string
}

export interface IQuestion {
  _id:            Types.ObjectId
  text:           string
  type:           'mcq' | 'subjective'
  options:        IOption[]
  correctOption?: string
  explanation?:   string
  marks:          number
  negativeMarks:  number
}

export interface IQuiz extends Document {
  _id:       Types.ObjectId
  title:     string
  subject:   string
  questions: IQuestion[]
  duration:  number
  createdBy: Types.ObjectId
  session?:  Types.ObjectId
  isActive:  boolean
  createdAt: Date
}

export interface IQuestionAttempt {
  questionId: string
  answer:     string
  isCorrect?: boolean
  flagged:    boolean
}

export interface IAttempt extends Document {
  _id:         Types.ObjectId
  quiz:        Types.ObjectId
  student:     Types.ObjectId
  answers:     IQuestionAttempt[]
  score:       number
  totalMarks:  number
  completedAt: Date
  createdAt:   Date
}

export interface ISubjectProgress {
  subject:      string
  score:        number
  totalQuizzes: number
  hoursStudied: number
  weakTopics:   string[]
}

export interface IProgress extends Document {
  student:              Types.ObjectId
  subjects:             ISubjectProgress[]
  totalHoursStudied:    number
  totalClassesAttended: number
  totalDoubtsSolved:    number
  weeklyHours:          number[]
  updatedAt:            Date
}

export interface AuthRequest extends Request {
  user?: IUser
}

export interface SocketUser {
  userId:  string
  name:    string
  email:   string
  role:    Role
  roomId?: string
}