# Refactor Plan: Partner Test App

## Overview

This document outlines the plan to modernize and reorganize the Partner Test App. The goal is to create a cleaner, more maintainable codebase that remains minimal and focused on demonstrating the Project Broadcast integration APIs.

## Goals

- **Minimal dependencies** - Remove `config` package, use native `.env` support
- **Modern tooling** - Node 24, TypeScript (native), ESLint 9, Prettier
- **Clear organization** - Logical folder structure with focused modules
- **Self-documenting code** - TypeScript types + smart comments
- **Feature addition** - User management (add/delete users via forms)
- **Match official API** - Types and behavior aligned with OpenAPI spec

---

## Official Documentation

This app is referenced in the official Project Broadcast partner documentation:

- **API Documentation**: https://app.projectbroadcast.com/apidoc/
- **Partner Integration Guide**: https://app.projectbroadcast.com/partner-integration.pdf

The code should serve as an exemplary reference implementation.

---

## Current State Issues

| Issue | Location | Problem |
|-------|----------|---------|
| Naming confusion | `services/project-broadcast.js` vs `lib/project-broadcast.js` | Two files, same name, different purposes |
| Mixed responsibilities | `routes/index.js` | 150+ lines handling user flows, legacy webhooks, AND admin |
| Root-level clutter | `users.js`, `webhook-events.js` | Data modules at root |
| Hardcoded URL | `lib/project-broadcast.js:112` | `https://pb.test/integrations/` hardcoded |
| Legacy + new mixed | `routes/index.js` | Legacy `/hooks/*` next to new admin routes |
| Old tooling | `package.json` | Standard.js, config package, Node 22 |

---

## New Directory Structure

```
├── app.ts
├── package.json
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── .nvmrc
├── README.md
├── .env.example
├── .gitignore
├── bin/
│   └── www.ts
├── data/
│   ├── users.ts
│   ├── users.json              # gitignored
│   ├── webhook-events.ts
│   └── webhook-events.json     # gitignored
├── lib/
│   ├── env.ts                  # Environment config helper
│   └── crypto.ts               # Signing & signature verification
├── api/
│   ├── integrator.ts           # Integrator API client
│   └── user.ts                 # User API client
├── routes/
│   ├── home.ts                 # Home page / user dashboard
│   ├── auth.ts                 # Login, logout, OAuth callback
│   ├── admin.ts                # Admin dashboard & actions
│   ├── webhooks.ts             # Stripe-style webhook receiver
│   └── legacy-hooks.ts         # Legacy /hooks/* endpoints
└── views/
    ├── partials/
    │   └── head.ejs            # Shared head with inline styles + nav
    ├── home.ejs
    ├── users.ejs
    ├── connect.ejs
    ├── error.ejs
    ├── admin.ejs
    ├── webhooks-received.ejs
    └── webhooks-sent.ejs
```

---

## Configuration

### .env.example

```bash
# Project Broadcast Partner Test App Configuration
# Copy to .env and fill in your values

PORT=3003

# Your partner ID from Project Broadcast
PARTNER_ID=

# Used to sign/verify requests and webhooks
SIGNING_KEY=

# API key for Integrator API endpoints
INTEGRATION_KEY=

# API URLs (defaults to production)
BASE_CONNECT_URL=https://app.projectbroadcast.com/integrations/
BASE_API_URL=https://app.projectbroadcast.com/api/v1/

# Set to '0' to allow self-signed certs (local dev only)
NODE_TLS_REJECT_UNAUTHORIZED=
```

### .nvmrc

```
24
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": false,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

### eslint.config.js

```javascript
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['data/*.json'],
  },
)
```

### prettier.config.js

```javascript
export default {
  semi: false,
  singleQuote: true,
  quoteProps: 'consistent',
  trailingComma: 'all',
  printWidth: 100,
}
```

---

## Dependencies

### Production

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `express-session` | Session handling |
| `cookie-parser` | Cookie parsing |
| `ejs` | Templates |
| `lowdb` | Simple JSON file storage |
| `morgan` | Request logging |
| `http-errors` | Error handling |

### Development

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `@types/node` | Node.js types |
| `@types/express` | Express types |
| `@types/express-session` | Session types |
| `@types/cookie-parser` | Cookie parser types |
| `@types/morgan` | Morgan types |
| `eslint` | Linting |
| `@eslint/js` | ESLint base config |
| `typescript-eslint` | TypeScript ESLint |
| `prettier` | Code formatting |
| `eslint-config-prettier` | Disable conflicting ESLint rules |
| `eslint-plugin-prettier` | Run Prettier as ESLint rule |
| `nodemon` | Dev server |
| `husky` | Git hooks |
| `lint-staged` | Run linters on staged files |

### Removed

| Package | Reason |
|---------|--------|
| `config` | Replaced with native `.env` support |
| `standard` | Replaced with ESLint + Prettier |

---

## Type Definitions

Types should align with the OpenAPI spec at https://app.projectbroadcast.com/apidoc/

```typescript
// data/users.ts
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  apiKey?: string
  lastLoginAt?: number
}

// data/webhook-events.ts - Events WE receive and store locally
interface ReceivedWebhookEvent {
  idempotencyKey: string
  eventType: WebhookEventType
  pcuid: string
  data: Record<string, unknown>
  receivedAt: string
}

// api/integrator.ts - From OpenAPI spec
type WebhookEventType =
  | 'user-connect'
  | 'user-disconnect'
  | 'trackable-link-click'
  | 'landing-page-view'
  | 'test'

interface Integrator {
  _id: string
  partnerId: string
  webhook: string | null
  webhookEvents: WebhookEventType[]  // Which events to subscribe to
  webhookDisabled?: boolean
  userConnectHook?: string           // Legacy hook URL
  userDisconnectHook?: string        // Legacy hook URL
  createdAt: string
  updatedAt: string
}

interface IntegratorUser {
  pcuid: string
}

interface PagingRequest {
  page?: number
  pageSize?: number
}

interface PagingResponse {
  total: number
  pageSize: number
  page: number
  pages: number
}

// Webhook event from PB's API (what PB sent/tried to send)
interface WebhookEvent {
  _id: string
  pcuid: string
  eventType: WebhookEventType
  status: 'pending' | 'success' | 'failed'
  payload: Record<string, unknown>
  responses: WebhookEventResponse[]  // Delivery attempt history
  idempotencyKey: string
  replayOf?: string                  // If this is a replay, original event ID
  createdAt: string
}

interface WebhookEventResponse {
  statusCode: number
  body: string                       // Truncated to 1000 chars
  error?: string
  duration: number                   // ms
}

// lib/crypto.ts
interface SignatureVerificationResult {
  valid: boolean
  error?: string
  timestamp?: number
}
```

---

## Two Signature Systems

The codebase handles two different signature verification methods:

### 1. Legacy Signing (Connect Flow & Legacy Hooks)

Used for: `/connect` redirect, `/configuration` endpoint, `/hooks/connected`, `/hooks/disconnected`

- Timestamp in **milliseconds**
- Sort params by key, join values with `:`
- HMAC-SHA256 of the joined string
- Signature passed as query param or body field

### 2. Stripe-Style Signing (New Webhooks)

Used for: `/webhooks/events` endpoint

- Timestamp in **seconds** (Unix time)
- Header format: `X-PB-Signature: t={timestamp},v1={signature}`
- Sign the string `{timestamp}.{rawBody}` (raw HTTP body, not parsed JSON)
- Retry policy: 6 attempts with exponential backoff (5s, 30s, 2min, 15min, 1h, 4h)

Both systems use the same `SIGNING_KEY` from your integration settings.

---

## New Feature: User Management

Add ability to create and delete test users via simple forms.

### data/users.ts additions

```typescript
export function create(user: Omit<User, 'id'>): User {
  const newUser: User = {
    id: crypto.randomUUID(),
    ...user,
  }
  db.data.users.push(newUser)
  db.write()
  return newUser
}

export function remove(userId: string): boolean {
  const index = db.data.users.findIndex((u) => u.id === userId)
  if (index === -1) return false
  db.data.users.splice(index, 1)
  db.write()
  return true
}
```

### routes/home.ts additions

```typescript
// Create a new user
router.post('/users', (req, res) => {
  const { firstName, lastName, email } = req.body
  if (!firstName || !lastName || !email) {
    return res.redirect('/?error=All fields required')
  }
  users.create({ firstName, lastName, email })
  res.redirect('/')
})

// Delete a user
router.post('/users/:id/delete', (req, res) => {
  users.remove(req.params.id)
  res.redirect('/')
})
```

### users.ejs

Add form for creating users and delete buttons on each user row.

---

## New Feature: Webhook Event Subscription Management

The Integrator API supports selecting which webhook event types to receive via the `webhookEvents` array.

### Admin dashboard additions

Add checkboxes to select which events to subscribe to:

```html
<form method="POST" action="/admin/webhook">
  <p>
    <label>Webhook URL:</label>
    <input type="url" name="webhookUrl" value="<%= integrator.webhook || '' %>">
  </p>
  <p>
    <label>Event Types:</label><br>
    <% const eventTypes = ['user-connect', 'user-disconnect', 'trackable-link-click', 'landing-page-view'] %>
    <% eventTypes.forEach(type => { %>
      <label>
        <input type="checkbox" name="webhookEvents" value="<%= type %>"
          <%= (integrator.webhookEvents || []).includes(type) ? 'checked' : '' %>>
        <%= type %>
      </label><br>
    <% }) %>
  </p>
  <button type="submit">Update</button>
</form>
```

### api/integrator.ts

```typescript
export async function updateIntegrator(options: {
  webhook?: string
  webhookEvents?: WebhookEventType[]
  userConnectHook?: string
  userDisconnectHook?: string
}): Promise<{ integrator: Integrator }> {
  const response = await fetch(`${env.baseApiUrl}integrator`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(options),
  })
  if (!response.ok) throw new Error(`Failed to update integrator: ${response.status}`)
  return response.json()
}
```

---

## Shared View Partial

### views/partials/head.ejs

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title><%= typeof title !== 'undefined' ? title : 'PB Partner Test App' %></title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
      line-height: 1.5;
    }
    nav {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #ddd;
    }
    nav a { margin-right: 1rem; }
    pre, code { background: #f5f5f5; padding: 0.2em 0.5em; border-radius: 3px; }
    pre { padding: 1rem; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f9f9f9; }
    .error { background: #fee; border: 1px solid #fcc; padding: 0.5rem 1rem; margin: 1rem 0; }
    .success { background: #efe; border: 1px solid #cfc; padding: 0.5rem 1rem; margin: 1rem 0; }
    button, input[type="submit"] { padding: 0.4rem 1rem; cursor: pointer; }
    input[type="url"], input[type="text"], input[type="email"] { padding: 0.4rem; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; }
    dt { font-weight: bold; }
    section { margin-bottom: 2rem; }
    h2 { margin-top: 2rem; }
  </style>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/admin">Admin</a>
    <a href="/admin/webhooks-received">Webhooks In</a>
    <a href="/admin/webhooks-sent">Webhooks Out</a>
  </nav>
```

Each view then uses:

```html
<%- include('partials/head', { title: 'Page Title' }) %>

<!-- page content -->

</body>
</html>
```

---

## Implementation Phases

| # | Phase | Details |
|---|-------|---------|
| 1 | **Config files** | Create `.env.example`, `.nvmrc`, `tsconfig.json`, `eslint.config.js`, `prettier.config.js` |
| 2 | **Package.json** | Update engines to 24, scripts, add/remove dependencies |
| 3 | **Lib layer** | Create `lib/env.ts`, `lib/crypto.ts` |
| 4 | **Data layer** | Create `data/users.ts` (with create/remove), `data/webhook-events.ts` |
| 5 | **API layer** | Create `api/integrator.ts`, `api/user.ts` with types |
| 6 | **Routes** | Create all route files: `home.ts`, `auth.ts`, `admin.ts`, `webhooks.ts`, `legacy-hooks.ts` |
| 7 | **App & bin** | Create `app.ts`, `bin/www.ts` |
| 8 | **Views** | Create `partials/head.ejs`, update all views |
| 9 | **Cleanup** | Delete old files |
| 10 | **.gitignore** | Update to ignore `.env`, `data/*.json` |
| 11 | **README** | Update documentation |
| 12 | **Install & Test** | Run `npm install`, verify everything works |

---

## Files to Delete

```
config/
  custom-environment-variables.json
  default.json
  local-development.json
services/
  integrator-api.js
  project-broadcast.js
public/
  stylesheets/
    style.css
routes/
  index.js
  webhooks.js
lib/
  project-broadcast.js
app.js
users.js
users.json
webhook-events.js
db-webhook-events.json
bin/www.js
```

## Files to Create

```
.env.example
.nvmrc (update)
.gitignore (update)
tsconfig.json
eslint.config.js
prettier.config.js
lib/env.ts
lib/crypto.ts
data/users.ts
data/webhook-events.ts
api/integrator.ts
api/user.ts
routes/home.ts
routes/auth.ts
routes/admin.ts
routes/webhooks.ts
routes/legacy-hooks.ts
app.ts
bin/www.ts
views/partials/head.ejs
(update all existing views)
```

---

## README Outline

```markdown
# Project Broadcast Partner Test App

A minimal testing tool for Project Broadcast partner integrations.

## Official Documentation

- **API Documentation**: https://app.projectbroadcast.com/apidoc/
- **Partner Integration Guide**: https://app.projectbroadcast.com/partner-integration.pdf

## What This Tests

1. **Partner Connect Flow** - OAuth-style user connection
2. **Integrator API** - Managing your integration settings
3. **Webhooks** - Receiving events from Project Broadcast (both legacy and Stripe-style)
4. **User API** - Making API calls on behalf of connected users

## Requirements

- Node.js >= 24

## Quick Start

1. Copy `.env.example` to `.env` and fill in your credentials
2. `npm install`
3. `npm start`
4. Open http://localhost:3003

## Configuration

See `.env.example` for all available options.

## Project Structure

- `api/` - API client modules for PB endpoints
- `lib/` - Core utilities (signing, env config)
- `data/` - Local JSON storage for testing
- `routes/` - Express route handlers
- `views/` - EJS templates

## Routes

### User Routes
- `GET /` - Home page / user list
- `POST /users` - Create a new test user
- `POST /users/:id/delete` - Delete a test user
- `GET /login/:userId` - Login as a user
- `GET /logout` - Logout
- `GET /connection` - OAuth callback

### Webhook Routes
- `POST /webhooks/events` - Stripe-style webhook receiver (recommended)
- `POST /hooks/connected` - Legacy connected webhook
- `POST /hooks/disconnected` - Legacy disconnected webhook

### Admin Routes
- `GET /admin` - Admin dashboard
- `POST /admin/webhook` - Update webhook URL and event subscriptions
- `POST /admin/webhook-test` - Send test webhook
- `GET /admin/webhooks-received` - View webhooks we received
- `GET /admin/webhooks-sent` - View webhooks PB sent (from API)
- `POST /admin/webhooks/:id/replay` - Replay a failed webhook

## Webhook Event Types

- `user-connect` - User connected their account (includes apiKey in data)
- `user-disconnect` - User disconnected their account
- `trackable-link-click` - A trackable link was clicked
- `landing-page-view` - A landing page was viewed
- `test` - Test event (from webhook test button)

## Signature Verification

This app demonstrates two signature verification methods:

1. **Legacy signing** - Used for connect flow and legacy `/hooks/*` endpoints
2. **Stripe-style signing** - Used for new `/webhooks/events` endpoint

See `lib/crypto.ts` for implementation details.
```

---

## Notes

- TypeScript runs natively in Node 24 - no build step required
- ESLint 9 uses flat config format (`eslint.config.js`)
- All JSON data files are gitignored - app starts with empty state
- Legacy webhook routes preserved for testing but marked as deprecated in code
- Types align with the official OpenAPI spec
- Reference docs (`v1.json`, `partner-integration.markdown`) are for development reference only and will not be kept in repo

