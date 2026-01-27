#!/usr/bin/env node

/**
 * HTTP Server Entry Point
 */

import app from '../app.ts'
import http from 'http'
import { env } from '../lib/env.ts'

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(env.port)
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string | number): number | string | false {
  const portNum = typeof val === 'string' ? parseInt(val, 10) : val

  if (isNaN(portNum)) {
    // named pipe
    return val as string
  }

  if (portNum >= 0) {
    // port number
    return portNum
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening(): void {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port
  console.log('Listening on ' + bind)
}
