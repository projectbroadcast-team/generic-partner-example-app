/**
 * Environment configuration helper
 *
 * Reads environment variables from .env file (loaded via --env-file flag)
 * and provides typed access with sensible defaults.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const env = {
  /** Server port */
  port: parseInt(optionalEnv('PORT', '3003'), 10),

  /** Express session secret */
  sessionSecret: requireEnv('SESSION_SECRET'),

  /** Your partner ID from Project Broadcast */
  partnerId: requireEnv('PARTNER_ID'),

  /** Used to sign/verify requests and webhooks */
  signingKey: requireEnv('SIGNING_KEY'),

  /** API key for Integrator API endpoints */
  integrationKey: requireEnv('INTEGRATION_KEY'),

  /** Base URL for the partner connect flow (browser redirects) */
  baseConnectUrl: optionalEnv('BASE_CONNECT_URL', 'https://app.projectbroadcast.com/integrations/'),

  /** Base URL for the Project Broadcast API */
  baseApiUrl: optionalEnv('BASE_API_URL', 'https://app.projectbroadcast.com/api/v1/'),

  /** Base URL for server-side /configuration calls (defaults to baseConnectUrl) */
  get baseConfigurationUrl(): string {
    return optionalEnv('BASE_CONFIGURATION_URL', this.baseConnectUrl)
  },
} as const

export type Env = typeof env
