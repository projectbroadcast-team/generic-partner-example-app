/**
 * Cryptographic signing utilities
 *
 * This module handles two different signature verification methods:
 *
 * 1. Legacy Signing (Connect Flow & Legacy Hooks)
 *    - Used for: /connect redirect, /configuration endpoint, /hooks/connected, /hooks/disconnected
 *    - Timestamp in milliseconds
 *    - Sort params by key, join values with ':'
 *    - HMAC-SHA256 of the joined string
 *    - Signature passed as query param or body field
 *
 * 2. Webhook Signing
 *    - Used for: /webhooks/events endpoint
 *    - Timestamp in seconds (Unix time)
 *    - Header format: X-PB-Signature: t={timestamp},v1={signature}
 *    - Sign the string `{timestamp}.{rawBody}` (raw HTTP body, not parsed JSON)
 *    - Retry policy: 6 attempts with exponential backoff (5s, 30s, 2min, 15min, 1h, 4h)
 *
 * Both systems use the same SIGNING_KEY from your integration settings.
 */

import { createHmac } from 'crypto'
import { env } from './env.ts'

// ============================================================================
// Legacy Signing (Connect Flow & Legacy Hooks)
// ============================================================================

const DEFAULT_TIMESTAMP_LENIENCY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Calculate HMAC-SHA256 signature for legacy signing
 */
function calculateSignature(message: string): string {
  return createHmac('sha256', env.signingKey).update(message).digest('hex')
}

/**
 * Check if a timestamp is within acceptable range (milliseconds)
 */
function isValidTimestamp(
  sentAt: number,
  receivedAt: number,
  leniency: number = DEFAULT_TIMESTAMP_LENIENCY_MS,
): boolean {
  return Math.abs(sentAt - receivedAt) < leniency
}

/**
 * Validate legacy-signed parameters
 *
 * Parameters must include `timestamp` (ms) and `signature`.
 * Signature is HMAC-SHA256 of sorted param values joined by ':'.
 */
export function areParamsValid(params: Record<string, unknown>): boolean {
  const { timestamp, signature } = params as { timestamp?: string; signature?: string }

  if (!timestamp || !signature) {
    return false
  }

  const sentAt = Number(timestamp)
  const receivedAt = Date.now()

  if (!isValidTimestamp(sentAt, receivedAt)) {
    return false
  }

  // Create a copy without signature for verification
  const paramsToSign = { ...params }
  delete paramsToSign.signature

  const message = Object.keys(paramsToSign)
    .sort()
    .map((key) => String(paramsToSign[key]))
    .join(':')
  const calculatedSignature = calculateSignature(message)

  return signature === calculatedSignature
}

/**
 * Add timestamp and signature to parameters
 */
export function stampAndSignParams<T extends Record<string, unknown>>(
  params: T,
): T & { timestamp: number; signature: string } {
  const signedParams = { ...params, timestamp: Date.now() } as T & {
    timestamp: number
    signature: string
  }
  const message = Object.keys(signedParams)
    .sort()
    .map((key) => String(signedParams[key as keyof typeof signedParams]))
    .join(':')
  signedParams.signature = calculateSignature(message)
  return signedParams
}

// ============================================================================
// Webhook Signing
// ============================================================================

export interface SignatureVerificationResult {
  valid: boolean
  error?: string
  timestamp?: number
}

/**
 * Verify webhook signature
 *
 * Format: X-PB-Signature: t={timestamp},v1={signature}
 * Timestamp is Unix time in seconds (not milliseconds)
 *
 * @param signatureHeader - The X-PB-Signature header value
 * @param rawBody - The raw request body bytes as a string (do not use parsed JSON)
 * @param leniencySeconds - How many seconds of clock drift to allow (default 300)
 */
export function verifyWebhookSignature(
  signatureHeader: string | undefined,
  rawBody: string,
  leniencySeconds: number = 300,
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing signature header' }
  }

  if (typeof rawBody !== 'string') {
    return { valid: false, error: 'rawBody must be the raw request body string, not parsed JSON' }
  }

  const parts = signatureHeader.split(',')
  const timestampPart = parts.find((p) => p.startsWith('t='))
  const signaturePart = parts.find((p) => p.startsWith('v1='))

  if (!timestampPart || !signaturePart) {
    return { valid: false, error: 'Invalid signature format' }
  }

  const timestamp = timestampPart.substring(2)
  const signature = signaturePart.substring(3)

  // Check timestamp is within acceptable range
  // Timestamp is in seconds (Unix time), not milliseconds
  const timestampSec = parseInt(timestamp, 10)
  const nowSec = Math.floor(Date.now() / 1000)
  const diff = Math.abs(nowSec - timestampSec)

  if (diff > leniencySeconds) {
    return { valid: false, error: 'Signature timestamp expired' }
  }

  // Verify signature using raw body bytes to avoid parser differences
  const signedPayload = `${timestamp}.${rawBody}`
  const expectedSignature = createHmac('sha256', env.signingKey).update(signedPayload).digest('hex')

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Signature mismatch' }
  }

  return { valid: true, timestamp: timestampSec }
}
