/**
 * Integrator API Client
 *
 * API client for managing your integration settings and connected users.
 * Uses the Integration API Key for authentication.
 *
 * @see https://app.projectbroadcast.com/apidoc/
 */

import { env } from '../lib/env.ts'
import type { WebhookEventType } from '../data/webhook-events.ts'

// ============================================================================
// Types (aligned with OpenAPI spec)
// ============================================================================

export interface Integrator {
  _id: string
  partnerId: string
  name?: string
  webhook: string | null
  webhookEvents: WebhookEventType[]
  userConnectHook?: string
  userDisconnectHook?: string
  createdAt: string
  updatedAt: string
}

export interface IntegratorUser {
  pcuid: string
}

export interface PagingRequest {
  page?: number
  pageSize?: number
}

export interface PagingResponse {
  total: number
  pageSize: number
  page: number
  pages: number
}

export interface WebhookEventResponse {
  statusCode: number
  body: string
  error?: string
  duration: number
}

export interface WebhookEvent {
  _id: string
  pcuid: string
  eventType: WebhookEventType
  status: 'pending' | 'success' | 'failed'
  payload: Record<string, unknown>
  responses: WebhookEventResponse[]
  idempotencyKey: string
  replayOf?: string
  createdAt: string
}

// ============================================================================
// API Client
// ============================================================================

function getHeaders(): HeadersInit {
  return {
    'X-Integration-Api-Key': env.integrationKey,
    'Content-Type': 'application/json',
  }
}

/**
 * Get integrator details
 */
export async function getIntegrator(): Promise<{ integrator: Integrator }> {
  const response = await fetch(`${env.baseApiUrl}integrator`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to get integrator: ${response.status}`)
  }

  return response.json()
}

export interface UpdateIntegratorOptions {
  webhook?: string
  webhookEvents?: WebhookEventType[]
  userConnectHook?: string
  userDisconnectHook?: string
}

/**
 * Update integrator settings
 */
export async function updateIntegrator(
  options: UpdateIntegratorOptions,
): Promise<{ integrator: Integrator }> {
  const response = await fetch(`${env.baseApiUrl}integrator`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    throw new Error(`Failed to update integrator: ${response.status}`)
  }

  return response.json()
}

/**
 * Update webhook URL (convenience wrapper)
 */
export async function updateWebhook(webhookUrl: string): Promise<{ integrator: Integrator }> {
  return updateIntegrator({ webhook: webhookUrl })
}

/**
 * List connected users
 */
export async function listUsers(
  options: PagingRequest = {},
): Promise<{ users: IntegratorUser[]; paging: PagingResponse }> {
  const response = await fetch(`${env.baseApiUrl}integrator/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      page: options.page || 1,
      pageSize: options.pageSize || 25,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.status}`)
  }

  return response.json()
}

export interface ListWebhookEventsOptions extends PagingRequest {
  status?: 'pending' | 'success' | 'failed'
  eventType?: WebhookEventType
}

/**
 * List webhook events that PB has sent/tried to send
 */
export async function listWebhookEvents(
  options: ListWebhookEventsOptions = {},
): Promise<{ events: WebhookEvent[]; paging: PagingResponse }> {
  const response = await fetch(`${env.baseApiUrl}integrator/webhook/events`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      page: options.page || 1,
      pageSize: options.pageSize || 25,
      status: options.status,
      eventType: options.eventType,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to list webhook events: ${response.status}`)
  }

  return response.json()
}

/**
 * Get a specific webhook event
 */
export async function getWebhookEvent(eventId: string): Promise<{ event: WebhookEvent }> {
  const response = await fetch(`${env.baseApiUrl}integrator/webhook/events/${eventId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to get webhook event: ${response.status}`)
  }

  return response.json()
}

/**
 * Replay a webhook event
 */
export async function replayWebhookEvent(eventId: string): Promise<{ event: WebhookEvent }> {
  const response = await fetch(`${env.baseApiUrl}integrator/webhook/events/${eventId}/replay`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to replay webhook event: ${response.status}`)
  }

  return response.json()
}

/**
 * Send a test webhook
 */
export async function sendTestWebhook(): Promise<{ success: boolean }> {
  const response = await fetch(`${env.baseApiUrl}integrator/webhook/test`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to send test webhook: ${response.status}`)
  }

  return response.json()
}

/**
 * Disconnect a user
 */
export async function disconnectUser(
  pcuid: string,
): Promise<{ disconnected: boolean; pcuid: string }> {
  const response = await fetch(
    `${env.baseApiUrl}integrator/users/${encodeURIComponent(pcuid)}/disconnect`,
    {
      method: 'POST',
      headers: getHeaders(),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to disconnect user: ${response.status}`)
  }

  return response.json()
}
