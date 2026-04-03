import mongoose, { Schema } from 'mongoose'
import { IQuiz }             from '../types'

const OptionSchema = new Schema(
  { id: String, text: String },
  { _id: false },
)

const QuestionSchema = new Schema({
  text:          { type: String, required: true },
  type:          { type: String, enum: ['mcq', 'subjective'], required: true },
  options:       { type: [OptionSchema], default: [] },
  correctOption: { type: String },
  explanation:   { type: String },
  marks:         { type: Number, default: 4 },
  negativeMarks: { type: Number, default: 1 },
})

const QuizSchema = new Schema<IQuiz>(
  {
    title:     { type: String, required: true },
    subject:   { type: String, required: true },
    questions: { type: [QuestionSchema], default: [] },
    duration:  { type: Number, default: 30 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    session:   { type: Schema.Types.ObjectId, ref: 'Session' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true },
)

const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema)
export default Quiz