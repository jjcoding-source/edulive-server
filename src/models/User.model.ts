import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { IUser } from '../types'

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'tutor', 'admin'], default: 'student' },
    avatar: { type: String },
    grade: { type: String },
    subjects: { type: [String], default: [] },
    bio: { type: String },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  this.password = await bcrypt.hash(this.password, 12)
})

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

const User = mongoose.model<IUser>('User', UserSchema)
export default User