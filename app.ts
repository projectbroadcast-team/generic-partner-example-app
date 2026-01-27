/**
 * Project Broadcast Partner Test App
 *
 * A minimal testing tool for Project Broadcast partner integrations.
 *
 * @see https://app.projectbroadcast.com/apidoc/
 * @see https://app.projectbroadcast.com/partner-integration.pdf
 */

import createError from 'http-errors'
import express, { type Request, type Response, type NextFunction } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import session from 'express-session'

import homeRouter from './routes/home.ts'
import authRouter from './routes/auth.ts'
import adminRouter from './routes/admin.ts'
import webhooksRouter from './routes/webhooks.ts'
import legacyHooksRouter from './routes/legacy-hooks.ts'
import { env } from './lib/env.ts'

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId?: string
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Session configuration
app.use(
  session({
    secret: env.sessionSecret,
    name: 'generic-partner-example-app-session-cookie',
    resave: false,
    saveUninitialized: true,
  }),
)

// View engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Request logging
app.use(logger('dev'))

// Webhook routes need raw body for signature verification - mount before express.json()
app.use('/webhooks', webhooksRouter)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Routes
app.use('/', homeRouter)
app.use('/', authRouter)
app.use('/', adminRouter)
app.use('/hooks', legacyHooksRouter)

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404))
})

// Error handler
app.use((err: createError.HttpError, req: Request, res: Response, _next: NextFunction) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Render the error page
  res.status(err.status || 500)
  res.render('error')
})

export default app
