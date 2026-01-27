/**
 * Local webhook event storage
 *
 * Stores webhook events that we receive from Project Broadcast.
 * Uses lowdb for simple JSON file persistence.
 * The webhook-events.json file is gitignored.
 */

import { JSONFileSyncPreset } from 'lowdb/node'

export type WebhookEventType =
  | 'user-connect'
  | 'user-disconnect'
  | 'trackable-link-click'
  | 'landing-page-view'
  | 'test'

export interface ReceivedWebhookEvent {
  idempotencyKey: string
  eventType: WebhookEventType
  pcuid: string
  data: Record<string, unknown>
  receivedAt: string
}

interface WebhookEventsData {
  events: ReceivedWebhookEvent[]
}

const defaultData: WebhookEventsData = { events: [] }

export const db = JSONFileSyncPreset<WebhookEventsData>('data/webhook-events.json', defaultData)

/**
 * Get all stored webhook events
 */
export function all(): ReceivedWebhookEvent[] {
  return db.data.events
}

/**
 * Add a new webhook event
 */
export function add(event: ReceivedWebhookEvent): ReceivedWebhookEvent {
  db.data.events.push(event)
  db.write()
  return event
}

/**
 * Find an event by idempotency key (for deduplication)
 */
export function findByIdempotencyKey(idempotencyKey: string): ReceivedWebhookEvent | undefined {
  return db.data.events.find((e) => e.idempotencyKey === idempotencyKey)
}

/**
 * Find all events of a specific type
 */
export function findByEventType(eventType: WebhookEventType): ReceivedWebhookEvent[] {
  return db.data.events.filter((e) => e.eventType === eventType)
}

/**
 * Find all events for a specific user
 */
export function findByUserId(pcuid: string): ReceivedWebhookEvent[] {
  return db.data.events.filter((e) => e.pcuid === pcuid)
}

/**
 * Clear all stored events
 */
export function clear(): void {
  db.data.events = []
  db.write()
}

/**
 * Get the count of stored events
 */
export function count(): number {
  return db.data.events.length
}
