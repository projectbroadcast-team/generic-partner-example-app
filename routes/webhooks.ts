/**
 * Webhook Routes
 *
 * Webhook receiver for events from Project Broadcast.
 *
 * The webhook signature uses the format:
 * X-PB-Signature: t={timestamp},v1={signature}
 *
 * Timestamp is Unix time in seconds, and the signature is calculated as:
 * HMAC-SHA256(signingKey, "{timestamp}.{rawBody}")
 */

import { Router, raw } from 'express'
import { verifyWebhookSignature } from '../lib/crypto.ts'
import * as webhookEvents from '../data/webhook-events.ts'
import * as users from '../data/users.ts'
import type { WebhookEventType } from '../data/webhook-events.ts'

// Extend Express Request to include rawBody
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: string
    }
  }
}

const router = Router()

// Capture raw body for signature verification
router.use(
  raw({
    type: 'application/json',
    verify: (req, _res, buf) => {
      ;(req as unknown as Express.Request).rawBody = buf.toString()
    },
  }),
)

// Parse the JSON after capturing raw body
router.use((req, _res, next) => {
  if (req.rawBody) {
    try {
      req.body = JSON.parse(req.rawBody)
    } catch {
      // Will be handled by the route
    }
  }
  next()
})

/**
 * Receive webhook events from Project Broadcast
 */
router.post('/events', async (req, res) => {
  const signatureHeader = req.get('X-PB-Signature')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 WEBHOOK RECEIVED')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Headers:')
  console.log('  X-PB-Signature:', signatureHeader || '(missing)')
  console.log('  Content-Type:', req.get('Content-Type'))
  console.log('  Content-Length:', req.get('Content-Length'))
  console.log('Raw Body:', req.rawBody?.substring(0, 500) || '(empty)')

  // Verify signature
  const verification = verifyWebhookSignature(signatureHeader, req.rawBody || '')

  console.log('Signature Verification:', verification.valid ? '✅ VALID' : '❌ INVALID')
  if (!verification.valid) {
    console.log('  Error:', verification.error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return res.status(401).json({ error: verification.error })
  }
  console.log(
    '  Timestamp:',
    verification.timestamp,
    `(${new Date((verification.timestamp || 0) * 1000).toISOString()})`,
  )

  const { eventType, pcuid, data, idempotencyKey } = req.body as {
    eventType: WebhookEventType
    pcuid: string
    data: Record<string, unknown>
    idempotencyKey: string
  }

  console.log('Payload:')
  console.log('  Event Type:', eventType)
  console.log('  PCUID:', pcuid)
  console.log('  Idempotency Key:', idempotencyKey)
  console.log('  Data:', JSON.stringify(data, null, 2))

  // Check for duplicate using idempotencyKey
  const existingEvent = webhookEvents.findByIdempotencyKey(idempotencyKey)
  if (existingEvent) {
    console.log('⚠️  Duplicate webhook - already processed')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return res.json({ received: true, duplicate: true })
  }

  // Store the event
  webhookEvents.add({
    idempotencyKey,
    eventType,
    pcuid,
    data,
    receivedAt: new Date().toISOString(),
  })
  console.log('💾 Event stored')

  // Handle specific event types
  switch (eventType) {
    case 'user-connect':
      // User connected their account - data includes apiKey
      console.log('🔗 Processing user-connect...')
      if (data.apiKey && typeof data.apiKey === 'string') {
        users.updateUser(pcuid, { apiKey: data.apiKey })
        console.log('  ✅ Updated user apiKey')
      } else {
        console.log('  ⚠️  No apiKey in data')
      }
      break

    case 'user-disconnect':
      // User disconnected their account
      console.log('🔓 Processing user-disconnect...')
      users.updateUser(pcuid, { apiKey: undefined })
      console.log('  ✅ Cleared user apiKey')
      break

    case 'trackable-link-click':
      // A trackable link was clicked
      console.log(
        `🔗 Link clicked: ${(data.trackableLink as { _id?: string })?._id} by contact ${(data.contact as { _id?: string })?._id}`,
      )
      break

    case 'landing-page-view':
      // A landing page was viewed
      console.log(
        `📄 Landing page viewed: ${(data.landingPage as { _id?: string })?._id} by contact ${(data.contact as { _id?: string })?._id}`,
      )
      break

    case 'test':
      // Test event from webhook test button
      console.log('🧪 Test webhook received')
      break

    default:
      console.log(`❓ Unknown event type: ${eventType}`)
  }

  console.log('✅ Webhook processed successfully')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  res.json({ received: true })
})

export default router
