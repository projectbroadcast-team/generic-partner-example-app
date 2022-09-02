import config from 'config'

import { createHmac } from 'crypto'

export const isValidRequest = (request, response, next) => {
  const pbSignatureHeader = request.get('X-PB-Signature')
  let valid = false

  if (pbSignatureHeader) {
    valid = isSignatureHeaderValid(request)
  } else {
    const params = { ...request[request.method === 'POST' ? 'body' : 'query'] }
    valid = areParamsValid(params)
  }

  if (!valid) {
    response.status(403).send('Signature mismatch or timestamp out of bounds')
  } else {
    next()
  }
}

export const isSignatureHeaderValid = (request) => {
  const pbSignatureHeader = request.get('X-PB-Signature')
  console.debug(`X-PB-Signature: ${pbSignatureHeader}`)
  const { t: timestamp, v1: signature } = pbSignatureHeader.split(',').reduce((keyValues, str) => {
    const [key, value] = str.split('=')
    keyValues[key] = value
    return keyValues
  }, {})

  // request.rawBody comes from using the verify option of the express.json middleware (found in app.js)
  const message = `${timestamp}.${request.rawBody}`

  return checkTimestampAndSignature(timestamp, signature, message)
}

export const areParamsValid = (params) => {
  const { timestamp, signature } = params

  delete params.signature
  const message = Object.keys(params).sort().map(key => params[key]).join(':')

  return checkTimestampAndSignature(timestamp, signature, message)
}

const checkTimestampAndSignature = (sentAt, signature, message) => {
  const receivedAt = new Date().getTime()
  console.debug(`sentAt: ${sentAt}`)
  console.debug(`receivedAt: ${receivedAt}`)
  if (!isValidTimestamp(sentAt, receivedAt)) {
    console.warn('Timestamp too far out of range')
    return false
  }

  const calculatedSignature = calculateSignature(message)
  console.debug(`signature message: ${message}`)
  console.debug(`signature received: ${signature}`)
  console.debug(`signature calculated: ${calculatedSignature}`)

  if (signature !== calculatedSignature) {
    console.warn('Signature mismatch')
    return false
  } else {
    return true
  }
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
    redirect: `http://localhost:${config.get('port')}/connection`
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
