import * as Sentry from '@sentry/node'
import { H3Error } from 'h3'
import type { NitroApp } from 'nitropack/runtime/app'
// import { nodeProfilingIntegration } from '@sentry/profiling-node' // Due to Vite can not resolve .node file
import type { ModuleOptions } from '../module'
import { useRuntimeConfig } from '#imports'

// Type stub (Due to Nuxt3 upstream BUG seriously https://github.com/nuxt/nuxt/issues/18556)
type NitroAppPlugin = (nitro: NitroApp) => void
function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

type SentryConfig = Parameters<typeof Sentry.init>[0]

export default defineNitroPlugin((nitroApp) => {
  // Module option
  const modOption = useRuntimeConfig().public.sentry as ModuleOptions

  // Create Sentry Init Config
  const sentryIntegrations: never[] = []
  const sentryConfig: SentryConfig = {
    dsn: modOption.dsn,
    debug: modOption.server?.debug,
  }

  // Config - nodeProfilingIntegration
  // const npiOpt = modOption.server?.nodeProfilingIntegration
  // if (npiOpt?.enable) {
  //   sentryIntegrations.push(nodeProfilingIntegration())
  //   const cfg: SentryConfig = {
  //     tracesSampleRate: npiOpt.tracesSampleRate,
  //     profilesSampleRate: npiOpt.profilesSampleRate,
  //   }
  //   Object.assign(sentryConfig, cfg)
  // }

  // Init Server Sentry
  const cfg: SentryConfig = { integrations: sentryIntegrations }
  Object.assign(sentryConfig, cfg)
  Sentry.init(sentryConfig)

  // App Error Caputure
  nitroApp.hooks.hook('error', (error) => {
    // Ignore errors specific HTTP status code
    if (error instanceof H3Error) {
      if (modOption.ignoreH3statusCode?.includes(error.statusCode)) {
        return
      }
    }
    Sentry.captureException(error)
  })

  // Provide $sentry
  nitroApp.hooks.hook('request', (event) => {
    event.context.$sentry = Sentry
  })

  // Shutdown hook
  nitroApp.hooks.hookOnce('close', async () => {
    await Sentry.close(2000)
  })
})
