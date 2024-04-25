import { browserTracingIntegration, captureException, init, replayIntegration, withScope } from '@sentry/vue'
import { H3Error } from 'h3'
import type { ModuleOptions } from '../module'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

type SentryConfig = Parameters<typeof init>[0]

export default defineNuxtPlugin({
  enforce: 'pre',
  setup(_nuxtApp) {
    // Module option
    const modOption = useRuntimeConfig().public.sentry as ModuleOptions

    // Create Sentry Init Config
    const sentryIntegrations = []
    const sentryConfig: SentryConfig = {
      dsn: modOption.dsn,
    }

    // Config - BrowserTracingIntegration
    const btiOpt = modOption.client.browserTracingIntegration
    if (btiOpt.enable) {
      sentryIntegrations.push(browserTracingIntegration())
      const cfg: SentryConfig = {
        tracesSampleRate: btiOpt.tracesSampleRate,
        tracePropagationTargets: btiOpt.tracePropagationTargets,
      }
      Object.assign(sentryConfig, cfg)
    }

    // Config - ReplayIntegration
    const riOpt = modOption.client.replayIntegration
    if (riOpt.enable) {
      sentryIntegrations.push(replayIntegration())
      const cfg = {
        replaysSessionSampleRate: riOpt.replaysSessionSampleRate,
        replaysOnErrorSampleRate: riOpt.replaysOnErrorSampleRate,
      }
      Object.assign(sentryConfig, cfg)
    }

    // Init Client Sentry
    const cfg: SentryConfig = {
      integrations: sentryIntegrations,
      debug: modOption.server.debug,
    }
    const mergedCfg = Object.assign(sentryConfig, cfg)
    console.log(mergedCfg)
    init(mergedCfg)

    // App layor Error Caputure
    _nuxtApp.vueApp.config.errorHandler = (err, context) => {
      // Ignore errors specific HTTP status code
      if (err instanceof H3Error) {
        if (err.statusCode === 404 || err.statusCode === 422)
          return
      }

      // Report error with context data
      withScope((scope) => {
        scope.setExtra('context', context)
        captureException(err)
      })
    }

    // Nuxt layor Error Caputure
    _nuxtApp.hook('app:error', (err) => {
      captureException(err)
    })
  },
})
