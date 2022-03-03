const express = require('express')
const router = express.Router()
const users = require('../users.js')
const { signedConnectUrlForUser, areParamsValid } = require('../lib/project-broadcast.js')
const { apiKeyForUser } = require('../services/project-broadcast.js')

router.get('/', async function (req, res, next) {
  if (req.session.user) {
    const user = req.session.user
    const signedConnectUrl = signedConnectUrlForUser(user)
    const apiKey = await apiKeyForUser(user)
    res.render('index', { user, signedConnectUrl, apiKey })
  } else {
    res.render('users', { users: users.all() })
  }
})

router.get('/connection', function (req, res, next) {
  const isValidParams = areParamsValid(req.query)
  if (!isValidParams) return res.send(401, 'Invalid request')
  res.render('connect')
})

router.get('/login/:userId', function (req, res, next) {
  const user = users.findById(req.params.userId)
  if (user) {
    user.lastLoginAt = Date.now()
  }
  req.session.user = user
  res.redirect('/')
})

router.get('/logout', function (req, res, next) {
  req.session.user = null
  res.redirect('/')
})

module.exports = router
