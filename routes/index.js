const express = require('express')
const router = express.Router()
const users = require('../users.js')

router.get('/', function (req, res, next) {
  if (req.session.user) {
    res.render('index', { user: req.session.user })
  } else {
    res.render('users', { users: users.all() })
  }
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
