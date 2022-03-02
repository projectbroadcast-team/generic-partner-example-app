const fetch = require('node-fetch')
const { signedConfigurationUrlForUser, areParamsValid } = require('../lib/project-broadcast.js')

const apiKeyForUser = async (user) => {
  const url = signedConfigurationUrlForUser(user)
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Accepts': 'application/json'
    }
  })
  if (!response.ok) {
    // 404 if user is not connected
    if (response.status === 404) {
      return null
    }
    throw new Error('Unexpected response')
  }

  const body = await response.json()
  if (!areParamsValid(body)) { throw new Error('Did not get a valid response.') }

  return body.apiKey
}

module.exports = {
  apiKeyForUser
}
