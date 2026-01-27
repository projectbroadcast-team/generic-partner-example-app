/**
 * User API Client
 *
 * API client for making requests on behalf of connected users.
 * Uses both the Integration API Key and the user's API Key.
 *
 * @see https://app.projectbroadcast.com/apidoc/
 */

import { env } from '../lib/env.ts'
import { stampAndSignParams, areParamsValid } from '../lib/crypto.ts'
import type { User } from '../data/users.ts'

// ============================================================================
// Types
// ============================================================================

interface PagingInfo {
  total: number
  page: number
  pageSize: number
  pages: number
}

interface SearchResponse<T> {
  results: T[]
  paging: PagingInfo
}

// ============================================================================
// API Client
// ============================================================================

function getHeadersForUser(user: User): HeadersInit {
  if (!user.apiKey) {
    throw new Error('User is not connected')
  }

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Integration-Api-Key': env.integrationKey,
    'X-Api-Key': user.apiKey,
  }
}

/**
 * Build a signed URL for the user configuration endpoint
 * Uses baseConfigurationUrl for server-side calls (may differ from baseConnectUrl in local dev)
 */
export function signedConfigurationUrlForUser(user: User): URL {
  const params = stampAndSignParams({ pcuid: user.id })
  const urlSearchParams = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  )
  return new URL(
    `${env.partnerId}/configuration?${urlSearchParams.toString()}`,
    env.baseConfigurationUrl,
  )
}

/**
 * Build a signed URL for the partner connect flow
 */
export function signedConnectUrlForUser(user: User): URL {
  const params = stampAndSignParams({
    pcuid: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    redirect: `http://localhost:${env.port}/connection`,
  })
  const urlSearchParams = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  )
  return new URL(`${env.partnerId}/connect?${urlSearchParams.toString()}`, env.baseConnectUrl)
}

/**
 * Get the API key for a user via the configuration endpoint
 * Returns null if user is not connected
 */
export async function apiKeyForUser(user: User): Promise<string | null> {
  const url = signedConfigurationUrlForUser(user)

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    // 404 if user is not connected
    if (response.status === 404) {
      return null
    }
    throw new Error(`Unexpected response: ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Expected JSON response but got:', contentType)
    return null
  }

  const body = await response.json()
  if (!areParamsValid(body)) {
    throw new Error('Did not get a valid response.')
  }

  return body.apiKey
}

/**
 * Generic search function for user resources
 */
async function search<T>(
  user: User,
  topic: string,
  term: string = '',
  page: number = 1,
  pageSize: number = 1,
): Promise<SearchResponse<T>> {
  if (!user.apiKey) {
    throw new Error('User is not connected')
  }

  const url = new URL(`${topic}/search`, env.baseApiUrl)
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeadersForUser(user),
    body: JSON.stringify({
      term,
      paging: {
        page,
        pageSize,
      },
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('User unauthorized and may be suspended')
    }
    throw new Error('Unexpected response')
  }

  return response.json()
}

/**
 * Get total campaigns for a user
 */
export async function totalCampaigns(user: User): Promise<number> {
  const body = await search(user, 'campaigns')
  return body.paging.total
}

/**
 * Get total contacts for a user
 */
export async function totalContacts(user: User): Promise<number> {
  const body = await search(user, 'contacts')
  return body.paging.total
}

/**
 * Get total keywords for a user
 */
export async function totalKeywords(user: User): Promise<number> {
  const body = await search(user, 'keywords')
  return body.paging.total
}

/**
 * Get total templates for a user
 */
export async function totalTemplates(user: User): Promise<number> {
  const body = await search(user, 'templates')
  return body.paging.total
}

/**
 * Get total trackable links for a user
 */
export async function totalTrackableLinks(user: User): Promise<number> {
  const body = await search(user, 'trackableLinks')
  return body.paging.total
}
