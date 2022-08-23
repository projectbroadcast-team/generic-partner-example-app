import express from 'express'

import { signedConnectUrlForUser, isValidRequest } from '../lib/project-broadcast.js'
import { apiKeyForUser, totalCampaigns, totalContacts, totalKeywords, totalTemplates, totalTrackableLinks } from '../services/project-broadcast.js'
import * as users from '../users.js'

const router = express.Router()

router.get('/', async function (req, res, next) {
  if (req.session.userId) {
    const user = users.findById(req.session.userId)
    const apiKey = await apiKeyForUser(user)
    users.updateUser(user.id, { apiKey })
    const isConnected = !!apiKey
    const signedConnectUrl = signedConnectUrlForUser(user)
    const totals = {}
    if (isConnected) {
      totals.campaigns = await totalCampaigns(user)
      totals.contacts = await totalContacts(user)
      totals.keywords = await totalKeywords(user)
      totals.templates = await totalTemplates(user)
      totals.trackableLinks = await totalTrackableLinks(user)
    }
    res.render('index', { user, signedConnectUrl, isConnected, totals })
  } else {
    res.render('users', { users: users.all() })
  }
})

router.get('/connection', isValidRequest, async function (req, res, next) {
  const user = users.findById(req.query.pcuid)
  const apiKey = await apiKeyForUser(user)
  users.updateUser(user, { apiKey })
  res.render('connect')
})

router.post('/hooks/connected', isValidRequest, function (req, res, next) {
  const { pcuid, apiKey } = req.body
  users.updateUser(pcuid, { apiKey })
  console.log(`User connected: ${pcuid}, ${apiKey}`)
  res.status(204).send('Success')
})

router.post('/hooks/disconnected', isValidRequest, function (req, res, next) {
  const { pcuid } = req.body
  users.updateUser(pcuid, { apiKey: undefined })
  console.log(`User disconnected: ${pcuid}`)
  res.status(204).send('Success')
})

router.post('/hooks/events', isValidRequest, function (req, res, next) {
  console.log(req.body)
  res.status(204).send('Success')
})

router.get('/login/:userId', function (req, res, next) {
  const user = users.findById(req.params.userId)
  if (user) {
    user.lastLoginAt = Date.now()
  }
  req.session.userId = user.id
  res.redirect('/')
})

router.get('/logout', function (req, res, next) {
  req.session.userId = null
  res.redirect('/')
})

export default router
