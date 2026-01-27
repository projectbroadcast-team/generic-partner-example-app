/**
 * Admin Routes
 *
 * Admin dashboard for managing integration settings,
 * viewing connected users, and monitoring webhooks.
 */

import { Router } from 'express'
import * as integratorApi from '../api/integrator.ts'
import * as webhookEvents from '../data/webhook-events.ts'
import type { WebhookEventType } from '../data/webhook-events.ts'

const router = Router()

/**
 * Admin dashboard
 */
router.get('/admin', async (req, res) => {
  try {
    const integrator = await integratorApi.getIntegrator()
    const usersResult = await integratorApi.listUsers()

    res.render('admin', {
      integrator: integrator.integrator,
      users: usersResult.users,
      usersPaging: usersResult.paging,
      success: req.query.success,
      error: req.query.error,
    })
  } catch (error) {
    console.error('Error loading admin:', error)
    res.render('admin', { error: (error as Error).message })
  }
})

/**
 * Update webhook URL and event subscriptions
 */
router.post('/admin/webhook', async (req, res) => {
  try {
    const { webhookUrl, webhookEvents: events, userConnectHook, userDisconnectHook } = req.body

    // webhookEvents comes as single value or array depending on number of checkboxes checked
    let webhookEventsList: WebhookEventType[] = []
    if (events) {
      webhookEventsList = Array.isArray(events) ? events : [events]
    }

    await integratorApi.updateIntegrator({
      webhook: webhookUrl || null,
      webhookEvents: webhookEventsList,
      userConnectHook: userConnectHook || null,
      userDisconnectHook: userDisconnectHook || null,
    })

    res.redirect('/admin?success=Webhook settings updated')
  } catch (error) {
    console.error('Error updating webhook:', error)
    res.redirect('/admin?error=' + encodeURIComponent((error as Error).message))
  }
})

/**
 * Send a test webhook
 */
router.post('/admin/webhook-test', async (req, res) => {
  try {
    await integratorApi.sendTestWebhook()
    res.redirect('/admin?success=Test webhook sent')
  } catch (error) {
    console.error('Error sending test webhook:', error)
    res.redirect('/admin?error=' + encodeURIComponent((error as Error).message))
  }
})

/**
 * View webhooks we have received from PB
 */
router.get('/admin/webhooks-received', (req, res) => {
  const events = webhookEvents.all()
  res.render('webhooks-received', {
    events,
    success: req.query.success,
  })
})

/**
 * Clear all received webhooks
 */
router.post('/admin/webhooks-received/clear', (req, res) => {
  webhookEvents.clear()
  res.redirect('/admin/webhooks-received?success=All received webhooks cleared')
})

/**
 * View webhooks PB has sent (from their API)
 */
router.get('/admin/webhooks-sent', async (req, res) => {
  try {
    const result = await integratorApi.listWebhookEvents({
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      status: req.query.status as 'pending' | 'success' | 'failed' | undefined,
      eventType: req.query.eventType as WebhookEventType | undefined,
    })

    res.render('webhooks-sent', {
      events: result.events,
      paging: result.paging,
      success: req.query.success,
      error: req.query.error,
    })
  } catch (error) {
    console.error('Error loading webhook events:', error)
    res.render('webhooks-sent', { error: (error as Error).message, events: [] })
  }
})

/**
 * Replay a failed webhook
 */
router.post('/admin/webhooks/:id/replay', async (req, res) => {
  try {
    await integratorApi.replayWebhookEvent(req.params.id)
    res.redirect('/admin/webhooks-sent?success=Webhook replayed')
  } catch (error) {
    console.error('Error replaying webhook:', error)
    res.redirect('/admin/webhooks-sent?error=' + encodeURIComponent((error as Error).message))
  }
})

/**
 * Disconnect a user
 */
router.post('/admin/users/:pcuid/disconnect', async (req, res) => {
  try {
    const result = await integratorApi.disconnectUser(req.params.pcuid)
    if (result.disconnected) {
      res.redirect('/admin?success=User disconnected: ' + result.pcuid)
    } else {
      res.redirect('/admin?error=Failed to disconnect user')
    }
  } catch (error) {
    console.error('Error disconnecting user:', error)
    res.redirect('/admin?error=' + encodeURIComponent((error as Error).message))
  }
})

export default router
