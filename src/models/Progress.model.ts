import mongoose, { Schema } from 'mongoose'
import { IProgress }         from '../types'

const SubjectProgressSchema = new Schema(
  {
    subject:      { type: String, required: true },
    score:        { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    hoursStudied: { type: Number, default: 0 },
    weakTopics:   { type: [String], default: [] },
  },
  { _id: false },
)

const ProgressSchema = new Schema<IProgress>(
  {
    student:              { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    subjects:             { type: [SubjectProgressSchema], default: [] },
    totalHoursStudied:    { type: Number, default: 0 },
    totalClassesAttended: { type: Number, default: 0 },
    totalDoubtsSolved:    { type: Number, default: 0 },
    weeklyHours:          { type: [Number], default: [0,0,0,0,0,0,0] },
  },
  { timestamps: true },
)

const Progress = mongoose.model<IProgress>('Progress', ProgressSchema)
export default Progress