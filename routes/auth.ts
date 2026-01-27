/**
 * Auth Routes
 *
 * Login, logout, and OAuth callback handling.
 */

import { Router } from 'express'
import * as users from '../data/users.ts'
import { areParamsValid } from '../lib/crypto.ts'
import { apiKeyForUser } from '../api/user.ts'

const router = Router()

/**
 * Login as a specific user
 */
router.get('/login/:userId', (req, res) => {
  const user = users.findById(req.params.userId)

  if (user) {
    users.updateUser(user.id, { lastLoginAt: Date.now() })
    req.session.userId = user.id
  }

  res.redirect('/')
})

/**
 * Logout current user
 */
router.get('/logout', (req, res) => {
  req.session.userId = undefined
  res.redirect('/')
})

/**
 * OAuth callback - called when user completes the connect flow
 *
 * This endpoint receives signed parameters from Project Broadcast
 * and updates the user's API key.
 */
router.get('/connection', async (req, res, next) => {
  try {
    const isValidParams = areParamsValid(req.query)
    if (!isValidParams) {
      return res.status(401).send('Invalid request')
    }

    const pcuid = req.query.pcuid as string
    const user = users.findById(pcuid)

    if (!user) {
      return res.status(404).send('User not found')
    }

    const apiKey = await apiKeyForUser(user)
    if (apiKey) {
      users.updateUser(user.id, { apiKey })
    }

    res.render('connect')
  } catch (error) {
    next(error)
  }
})

export default router
