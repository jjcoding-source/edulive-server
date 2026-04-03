import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

export const errorHandler = (
  err:  any,
  req:  Request,
  res:  Response,
  next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500
  let message    = err.message    || 'Internal Server Error'

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    message    = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    statusCode = 409
  }

  if (err.name === 'CastError') {
    message    = `Invalid ${err.path}: ${err.value}`
    statusCode = 400
  }

  if (err.name === 'ValidationError') {
    message    = Object.values(err.errors).map((e: any) => e.message).join('. ')
    statusCode = 400
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
}