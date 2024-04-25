import { captureException, init, withScope } from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
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

    // Config - nodeProfilingIntegration
    const npiOpt = modOption.server.nodeProfilingIntegration
    if (npiOpt.enable) {
      sentryIntegrations.push(nodeProfilingIntegration())
      const cfg: SentryConfig = {
        tracesSampleRate: npiOpt.tracesSampleRate,
        profilesSampleRate: npiOpt.profilesSampleRate,
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
