import { Server, Socket } from 'socket.io'
import { verifyToken }    from '../utils/jwt'
import Session            from '../models/Session.model'
import Progress           from '../models/Progress.model'
import { SocketUser }     from '../types'
import mongoose           from 'mongoose'

// In-memory store
const clients = new Map<string, SocketUser>()

const getParticipants = (roomId: string) =>
  Array.from(clients.values())
    .filter(c => c.roomId === roomId)
    .map(({ userId, name, role }) => ({ userId, name, role }))

export const initClassroomSocket = (io: Server): void => {

  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.query?.token  as string)

      if (!token) return next(new Error('No token provided'))

      const payload = verifyToken(token.replace('Bearer ', '')) as {
        sub: string; email: string; role: string; name: string
      }

      clients.set(socket.id, {
        userId: payload.sub,
        name:   payload.name || payload.email,
        email:  payload.email,
        role:   payload.role as any,
      })
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`)
    socket.emit('connected', { message: 'Connected to EduLive' })

    socket.on('classroom:join', async ({ roomId }: { roomId: string }) => {
      try {
        const session = await Session.findOne({ roomId })
          .populate('tutor', 'name avatar')
          .lean()

        if (!session) {
          socket.emit('error', { message: 'Room not found' })
          return
        }

        socket.join(roomId)
        const info = clients.get(socket.id)!
        clients.set(socket.id, { ...info, roomId })

        socket.emit('classroom:joined', {
          roomId,
          session: {
            _id:     session._id,
            title:   session.title,
            subject: session.subject,
            status:  session.status,
            tutor:   session.tutor,
          },
        })

        socket.to(roomId).emit('classroom:userJoined', {
          userId: info.userId,
          name:   info.name,
          role:   info.role,
        })

        io.to(roomId).emit('classroom:participants', getParticipants(roomId))

        if (info.role === 'student') {
          await Progress.findOneAndUpdate(
            { student: new mongoose.Types.ObjectId(info.userId) },
            { $inc: { totalClassesAttended: 1 } },
            { upsert: true },
          )
        }
      } catch (err) {
        console.error('classroom:join error:', err)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    socket.on('classroom:leave', ({ roomId }: { roomId: string }) => {
      const info = clients.get(socket.id)
      if (!info) return
      socket.leave(roomId)
      clients.set(socket.id, { ...info, roomId: undefined })
      socket.to(roomId).emit('classroom:userLeft', { userId: info.userId, name: info.name })
      io.to(roomId).emit('classroom:participants', getParticipants(roomId))
    })

    socket.on('chat:send', ({ roomId, text }: { roomId: string; text: string }) => {
      const info = clients.get(socket.id)
      if (!info || !text.trim()) return

      const message = {
        _id:       `${Date.now()}-${socket.id.slice(0, 6)}`,
        roomId,
        sender:    { _id: info.userId, name: info.name, role: info.role },
        text:      text.trim(),
        timestamp: new Date().toISOString(),
      }

      io.to(roomId).emit('chat:message', message)
    })

    socket.on('classroom:raiseHand', ({ roomId, raised }: { roomId: string; raised: boolean }) => {
      const info = clients.get(socket.id)
      if (!info) return
      socket.to(roomId).emit('classroom:handRaised', {
        userId: info.userId,
        name:   info.name,
        raised,
      })
    })

    socket.on('whiteboard:draw', ({ roomId, event }: { roomId: string; event: any }) => {
      socket.to(roomId).emit('whiteboard:event', event)
    })

    socket.on('whiteboard:clear', ({ roomId }: { roomId: string }) => {
      io.to(roomId).emit('whiteboard:cleared')
    })

    socket.on('doubt:raise', async ({ roomId, text }: { roomId: string; text: string }) => {
      const info = clients.get(socket.id)
      if (!info) return

      const doubt = {
        _id:       `${Date.now()}-doubt`,
        from:      { userId: info.userId, name: info.name },
        text,
        timestamp: new Date().toISOString(),
      }

      io.to(roomId).emit('doubt:new', doubt)

      await Progress.findOneAndUpdate(
        { student: new mongoose.Types.ObjectId(info.userId) },
        { $inc: { totalDoubtsSolved: 1 } },
        { upsert: true },
      ).catch(() => {})
    })

    socket.on('quiz:start', ({ roomId, quizId }: { roomId: string; quizId: string }) => {
      const info = clients.get(socket.id)
      if (!info || info.role !== 'tutor') return
      socket.to(roomId).emit('quiz:started', { quizId })
    })

    socket.on('disconnect', () => {
      const info = clients.get(socket.id)
      if (info?.roomId) {
        socket.to(info.roomId).emit('classroom:userLeft', {
          userId: info.userId,
          name:   info.name,
        })
        io.to(info.roomId).emit('classroom:participants', getParticipants(info.roomId))
      }
      clients.delete(socket.id)
      console.log(`🔌 Socket disconnected: ${socket.id}`)
    })
  })
}