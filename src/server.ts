import 'dotenv/config'
import http             from 'http'
import { Server }       from 'socket.io'
import app              from './app'
import connectDB        from './config/db'
import { initClassroomSocket } from './socket/classroom.socket'

const PORT = process.env.PORT || 4000

const startServer = async () => {
    
  await connectDB()

  const httpServer = http.createServer(app)

  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  initClassroomSocket(io)

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 EduLive server running`)
    console.log(`   REST API  → http://localhost:${PORT}/api`)
    console.log(`   WebSocket → ws://localhost:${PORT}`)
    console.log(`   Health    → http://localhost:${PORT}/api/health\n`)
  })

  process.on('unhandledRejection', (err: any) => {
    console.error('Unhandled Rejection:', err.message)
    httpServer.close(() => process.exit(1))
  })
}

startServer()