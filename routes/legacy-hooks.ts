/**
 * Legacy Hook Routes
 *
 * @deprecated Use the /webhooks/events endpoint instead.
 *
 * These legacy endpoints are maintained for backwards compatibility
 * with older integrations. New integrations should use the webhooks router.
 *
 * Legacy hooks use millisecond timestamps and body-based signatures.
 */

import { Router } from 'express'
import { areParamsValid } from '../lib/crypto.ts'
import * as users from '../data/users.ts'

const router = Router()

/**
 * Legacy user connected webhook
 *
 * @deprecated Use /webhooks/events with eventType: 'user-connect'
 */
router.post('/connected', (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 LEGACY HOOK: /hooks/connected')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Body:', JSON.stringify(req.body, null, 2))

  const isValidParams = areParamsValid(req.body)
  console.log('Signature Verification:', isValidParams ? '✅ VALID' : '❌ INVALID')

  if (!isValidParams) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return res.status(401).send('Invalid request')
  }

  const { pcuid, apiKey } = req.body
  users.updateUser(pcuid, { apiKey })
  console.log('🔗 User connected:', pcuid)
  console.log('  API Key:', apiKey)
  console.log('✅ Updated user record')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  res.status(204).send('Success')
})

/**
 * Legacy user disconnected webhook
 *
 * @deprecated Use /webhooks/events with eventType: 'user-disconnect'
 */
router.post('/disconnected', (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 LEGACY HOOK: /hooks/disconnected')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Body:', JSON.stringify(req.body, null, 2))

  const isValidParams = areParamsValid(req.body)
  console.log('Signature Verification:', isValidParams ? '✅ VALID' : '❌ INVALID')

  if (!isValidParams) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return res.status(401).send('Invalid request')
  }

  const { pcuid } = req.body
  users.updateUser(pcuid, { apiKey: undefined })
  console.log('🔓 User disconnected:', pcuid)
  console.log('✅ Cleared user apiKey')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  res.status(204).send('Success')
})

export default router
