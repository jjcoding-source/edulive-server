import mongoose from 'mongoose'

const connectDB = async (): Promise<void> => {
  try {
    const uri  = process.env.MONGO_URI || 'mongodb://localhost:27017/edulive'
    const conn = await mongoose.connect(uri)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB disconnected on app termination')
  process.exit(0)
})

export default connectDB