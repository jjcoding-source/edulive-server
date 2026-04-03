import mongoose, { Schema } from 'mongoose'
import { IAttempt }          from '../types'

const QuestionAttemptSchema = new Schema(
  {
    questionId: { type: String, required: true },
    answer:     { type: String, default: '' },
    isCorrect:  { type: Boolean },
    flagged:    { type: Boolean, default: false },
  },
  { _id: false },
)

const AttemptSchema = new Schema<IAttempt>(
  {
    quiz:        { type: Schema.Types.ObjectId, ref: 'Quiz',    required: true },
    student:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    answers:     { type: [QuestionAttemptSchema], default: [] },
    score:       { type: Number, default: 0 },
    totalMarks:  { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

AttemptSchema.index({ student: 1, quiz: 1 })

const Attempt = mongoose.model<IAttempt>('Attempt', AttemptSchema)
export default Attempt