/**
 * Home Routes
 *
 * Home page / user dashboard and user management.
 */

import { Router } from 'express'
import * as users from '../data/users.ts'
import {
  signedConnectUrlForUser,
  apiKeyForUser,
  totalCampaigns,
  totalContacts,
  totalKeywords,
  totalTemplates,
  totalTrackableLinks,
} from '../api/user.ts'

const router = Router()

/**
 * Home page - shows user list or logged-in user dashboard
 */
router.get('/', async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = users.findById(req.session.userId)

      if (!user) {
        req.session.userId = undefined
        return res.redirect('/')
      }

      let isConnected = false
      const totals: Record<string, number> = {}

      try {
        const apiKey = await apiKeyForUser(user)
        if (apiKey) {
          users.updateUser(user.id, { apiKey })
          isConnected = true

          totals.campaigns = await totalCampaigns(user)
          totals.contacts = await totalContacts(user)
          totals.keywords = await totalKeywords(user)
          totals.templates = await totalTemplates(user)
          totals.trackableLinks = await totalTrackableLinks(user)
        }
      } catch (apiError) {
        console.error('API error:', (apiError as Error).message)
      }

      const signedConnectUrl = signedConnectUrlForUser(user)
      res.render('home', { user, signedConnectUrl, isConnected, totals })
    } else {
      res.render('users', {
        users: users.all(),
        success: req.query.success,
        error: req.query.error,
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * Create a new user
 */
router.post('/users', (req, res) => {
  const { firstName, lastName, email } = req.body ?? {}

  if (!firstName || !lastName || !email) {
    return res.redirect('/?error=All fields are required')
  }

  const user = users.create({ firstName, lastName, email })
  res.redirect('/?success=User created: ' + user.firstName + ' ' + user.lastName)
})

/**
 * Delete a user
 */
router.post('/users/:id/delete', (req, res) => {
  const user = users.findById(req.params.id)
  users.remove(req.params.id)
  res.redirect('/?success=User deleted' + (user ? ': ' + user.firstName + ' ' + user.lastName : ''))
})

export default router
