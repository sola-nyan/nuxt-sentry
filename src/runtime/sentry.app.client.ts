import { browserTracingIntegration, captureException, init, replayIntegration, withScope } from '@sentry/vue'
import { H3Error } from 'h3'
import type { ModuleOptions } from '../module'
import { defineNuxtPlugin, useRouter, useRuntimeConfig } from '#app'

type SentryConfig = Parameters<typeof init>[0]

export default defineNuxtPlugin({
  enforce: 'pre',
  setup(_nuxtApp) {
    // Module option
    const modOption = useRuntimeConfig().public.sentry as ModuleOptions

    // Create Sentry Init Config
    const sentryIntegrations = []
    const sentryConfig: SentryConfig = {
      app: _nuxtApp.vueApp,
      dsn: modOption.dsn,
      debug: modOption?.client?.debug,
      release: modOption.release,
    }

    // Router instance

    // Config - BrowserTracingIntegration
    const btiOpt = modOption?.client?.browserTracingIntegration
    if (btiOpt?.enable) {
      const router = useRouter()
      sentryIntegrations.push(browserTracingIntegration({ router }))
      const cfg: SentryConfig = {
        tracesSampleRate: btiOpt.tracesSampleRate,
        tracePropagationTargets: btiOpt.tracePropagationTargets,
      }
      Object.assign(sentryConfig, cfg)
    }

    // Config - ReplayIntegration
    const riOpt = modOption?.client?.replayIntegration
    if (riOpt?.enable) {
      sentryIntegrations.push(replayIntegration())
      const cfg = {
        replaysSessionSampleRate: riOpt.replaysSessionSampleRate,
        replaysOnErrorSampleRate: riOpt.replaysOnErrorSampleRate,
      }
      Object.assign(sentryConfig, cfg)
    }

    // Init Client Sentry
    const cfg: SentryConfig = { integrations: sentryIntegrations }
    Object.assign(sentryConfig, cfg)
    init(sentryConfig)

    // App layer Error Caputure
    _nuxtApp.vueApp.config.errorHandler = (error, context) => {
      // Ignore errors specific HTTP status code
      if (error instanceof H3Error) {
        if (modOption.ignoreH3statusCode?.includes(error.statusCode)) {
          return
        }
      }

      // Report error with context data
      withScope((scope) => {
        scope.setExtra('context', context)
        captureException(error)
      })
    }

    // Nuxt layer Error Caputure
    _nuxtApp.hook('app:error', (error) => {
      captureException(error)
    })
  },
})
