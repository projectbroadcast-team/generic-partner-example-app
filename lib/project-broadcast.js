import config from 'config'

import { createHmac } from 'crypto'

export const isValidRequest = (request) => {
  const params = { ...request[request.method === 'POST' ? 'body' : 'query'] }
  return areParamsValid(params)
}

export const areParamsValid = (params) => {
  const { timestamp, signature } = params

  const sentAt = timestamp
  const receivedAt = new Date().getTime()
  if (!isValidTimestamp(sentAt, receivedAt)) { return false }

  delete params.signature
  const message = Object.keys(params).sort().map(key => params[key]).join(':')
  const calculatedSignature = calculateSignature(message)

  return (signature === calculatedSignature)
}

const defaultLeniency = 5 * 60 * 1000 // 5 mins
const isValidTimestamp = (sentAt, receivedAt, leniency = defaultLeniency) => {
  return (Math.abs(Number(sentAt) - Number(receivedAt)) < Number(leniency))
}

const calculateSignature = (message) => {
  const signingKey = config.get('signingKey')
  return createHmac('sha256', signingKey).update(message).digest('hex')
}

export const stampAndSignParams = (params) => {
  const signedParams = { ...params }
  signedParams.timestamp = new Date().getTime()
  const message = Object.keys(signedParams).sort().map(key => signedParams[key]).join(':')
  signedParams.signature = calculateSignature(message)
  return signedParams
}

export const signedConnectUrlForUser = (user) => {
  const params = stampAndSignParams({
    pcuid: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    redirect: 'http://localhost:3003/connection'
  })
  const urlSearchParams = new URLSearchParams(params)
  const baseUrl = config.get('baseConnectUrl')
  const partnerId = config.get('partnerId')
  const url = new URL(`${partnerId}/connect?${urlSearchParams.toString()}`, baseUrl)
  return url
}

export const signedConfigurationUrlForUser = (user) => {
  const params = stampAndSignParams({ pcuid: user.id })
  const urlSearchParams = new URLSearchParams(params)
  const baseUrl = config.get('baseConnectUrl')
  const partnerId = config.get('partnerId')
  const url = new URL(`${partnerId}/configuration?${urlSearchParams.toString()}`, baseUrl)
  return url
}
