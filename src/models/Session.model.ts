import mongoose, { Schema } from 'mongoose'
import { ISession }          from '../types'

const SessionSchema = new Schema<ISession>(
  {
    title:           { type: String, required: true },
    subject:         { type: String, required: true },
    tutor:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startTime:       { type: Date, required: true },
    endTime:         { type: Date },
    status:          { type: String, enum: ['scheduled','live','ended'], default: 'scheduled' },
    roomId:          { type: String, required: true, unique: true },
    students:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    maxStudents:     { type: Number, default: 50 },
    description:     { type: String },
    durationMinutes: { type: Number, default: 60 },
  },
  { timestamps: true },
)

SessionSchema.index({ roomId: 1 })
SessionSchema.index({ tutor: 1, status: 1 })
SessionSchema.index({ startTime: 1 })

const Session = mongoose.model<ISession>('Session', SessionSchema)
export default Session