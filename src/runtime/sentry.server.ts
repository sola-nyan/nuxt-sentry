import type { IncomingMessage } from 'node:http'
import * as Sentry from '@sentry/node'
import { H3Error } from 'h3'
import type { NitroApp } from 'nitropack/runtime/app'
import type { ModuleOptions } from '../module'
import { useRuntimeConfig } from '#imports'

// Type stub (Due to Nuxt3 upstream BUG seriously https://github.com/nuxt/nuxt/issues/18556)
type NitroAppPlugin = (nitro: NitroApp) => void
function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

type SentryConfig = Parameters<typeof Sentry.init>[0]

declare module 'h3' {
  interface H3EventContext {
    $sentry?: typeof Sentry
    $sentryRequestSpan?: { span: Sentry.Span, finish: () => void }
  }
}

function getIP(req?: IncomingMessage) {
  if (!req)
    return undefined

  if (req.headers['x-forwarded-for']) {
    const ips = req.headers['x-forwarded-for']
    return Array.isArray(ips) ? ips[0] : ips
  }

  if (req && req.socket.remoteAddress) {
    return req.socket.remoteAddress
  }

  return undefined
};

export default defineNitroPlugin(async (nitroApp) => {
  // Module option
  const modOption = useRuntimeConfig().public.sentry as ModuleOptions

  // Create Sentry Init Config
  const sentryIntegrations
    = modOption.server?.autoDiscover
      ? Sentry.autoDiscoverNodePerformanceMonitoringIntegrations()
      : []

  const sentryConfig: SentryConfig = {
    dsn: modOption.dsn,
    debug: modOption.server?.debug,
    release: modOption.release,
    tracesSampleRate: modOption?.server?.tracesSampleRate,
  }

  // Init Server Sentry
  const cfg: SentryConfig = { integrations: sentryIntegrations }
  Object.assign(sentryConfig, cfg)
  Sentry.init(sentryConfig)

  // App Error Caputure
  nitroApp.hooks.hook('error', (error, context) => {
    // Ignore errors specific HTTP status code
    if (error instanceof H3Error) {
      if (!modOption.ignoreH3statusCode?.includes(error.statusCode)) {
        Sentry.captureException(error)
      }
    }

    if (context.event) {
      const event = context.event
      const span = event.context.$sentryRequestSpan?.span
      if (span) {
        Sentry.setHttpStatus(span, event.node.res.statusCode)
        span.end()
      }
    }
  })

  // Request Hook: Provide $sentry and Start Span
  nitroApp.hooks.hook('request', (event) => {
    // Provide $sentry
    event.context.$sentry = Sentry
    // Start Span
    const scope = new Sentry.Scope()
    scope.setUser({
      ip_address: getIP(event.node.req),
    })
    if (modOption.server?.traceTargetPath?.find(r => event.path.startsWith(r))) {
      Sentry.startSpanManual({
        name: `${event.method}: ${event.path}`,
        op: 'http',
        scope,
      }, (span, finish) => {
        if (span) {
          span.setAttribute(Sentry.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'manual.requests')
          event.context.$sentryRequestSpan = { span, finish }
        }
      })
    }
  })

  // Response After Hook: Finish Span
  nitroApp.hooks.hook('afterResponse', (event) => {
    const span = event.context.$sentryRequestSpan?.span
    if (span) {
      Sentry.setHttpStatus(span, event.node.res.statusCode)
      span.end()
    }
  })

  // Shutdown hook
  nitroApp.hooks.hookOnce('close', async () => {
    await Sentry.close(2000)
  })
})
