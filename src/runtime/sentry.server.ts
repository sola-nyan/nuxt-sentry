import * as Sentry from '@sentry/node'
import * as h3 from 'h3'
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

export default defineNitroPlugin(async (nitroApp) => {
  // Module option
  const modOption = useRuntimeConfig().public.sentry as ModuleOptions
  const EnableCustomInst = modOption.server?.customInst

  // Create Sentry Init Config
  const sentryIntegrations
    = modOption.server?.autoDiscoverIntegration
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
    if (error instanceof h3.H3Error) {
      if (!modOption.ignoreH3statusCode?.includes(error.statusCode)) {
        Sentry.captureException(error)
      }
    }

    // Custom Inst.
    if (EnableCustomInst) {
      if (context.event) {
        const event = context.event
        const span = event.context.$sentryRequestSpan?.span
        if (span) {
          Sentry.setHttpStatus(span, error instanceof h3.H3Error ? error.statusCode : event.node.res.statusCode)
          span.end()
        }
      }
    }
  })

  // Request Hook: Provide $sentry and Start Span
  nitroApp.hooks.hook('request', (event) => {
    // Provide $sentry
    event.context.$sentry = Sentry

    // Custom Inst.
    if (EnableCustomInst) {
      // Start Span
      const scope = new Sentry.Scope()
      const ip = h3.getRequestIP(event, { xForwardedFor: true })
      scope.setUser({
        ip_address: ip,
      })

      if (modOption.server?.traceTargetPath?.find(r => event.path.startsWith(r))) {
        const url = h3.getRequestURL(event)
        Sentry.startSpanManual({
          name: `${event.method} ${url}`,
          op: 'http.client',
          scope,
          attributes: {
            'server.address': `${event.node.req.headers.host}`,
          },
        }, (span, finish) => {
          if (span) {
            event.context.$sentryRequestSpan = { span, finish }
          }
        })
      }
    }
  })

  // Response After Hook: Finish Span
  nitroApp.hooks.hook('afterResponse', (event) => {
    // Custom Inst.
    if (EnableCustomInst) {
      const span = event.context.$sentryRequestSpan?.span
      if (span) {
        Sentry.setHttpStatus(span, event.node.res.statusCode)
        span.end()
      }
    }
  })

  // Shutdown hook
  nitroApp.hooks.hookOnce('close', async () => {
    await Sentry.close(2000)
  })
})
