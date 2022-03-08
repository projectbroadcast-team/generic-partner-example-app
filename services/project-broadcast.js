import config from 'config'
import fetch from 'node-fetch'
import { signedConfigurationUrlForUser, areParamsValid } from '../lib/project-broadcast.js'

const headersForUserApi = (user) => ({
  'Content-Type': 'application/json',
  Accepts: 'application/json',
  'X-Integration-Api-Key': config.get('integrationKey'),
  'X-Api-Key': user.apiKey
})

export const apiKeyForUser = async (user) => {
  const url = signedConfigurationUrlForUser(user)
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accepts: 'application/json'
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

const search = async function (user, topic, term = '', page = 1, pageSize = 1) {
  if (!user.apiKey) { throw new Error('USer is not connected') }

  const url = new URL(`${topic}/search`, config.get('baseApiUrl'))
  const response = await fetch(url, {
    method: 'POST',
    headers: headersForUserApi(user),
    body: JSON.stringify({
      term,
      paging: {
        page,
        pageSize
      }
    })
  })

  if (!response.ok) { throw new Error('Unexpected response') }

  const body = await response.json()
  return body
}

export const totalCampaigns = async (user) => {
  const body = await search(user, 'campaigns')
  return body.paging.total
}

export const totalContacts = async (user) => {
  const body = await search(user, 'contacts')
  return body.paging.total
}

export const totalKeywords = async (user) => {
  const body = await search(user, 'keywords')
  return body.paging.total
}

export const totalTemplates = async (user) => {
  const body = await search(user, 'templates')
  return body.paging.total
}

export const totalTrackableLinks = async (user) => {
  const body = await search(user, 'trackableLinks')
  return body.paging.total
}
