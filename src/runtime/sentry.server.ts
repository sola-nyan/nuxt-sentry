import { captureException, init } from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { H3Error } from 'h3'
import type { NitroApp } from 'nitropack/runtime/app'
import type { ModuleOptions } from '../module'
import { useRuntimeConfig } from '#imports'

// Type stub (Nuxt3 upstream bug)
type NitroAppPlugin = (nitro: NitroApp) => void
function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

type SentryConfig = Parameters<typeof init>[0]

export default defineNitroPlugin((nitroApp) => {
  // Module option
  const modOption = useRuntimeConfig().public.sentry as ModuleOptions

  // Create Sentry Init Config
  const sentryIntegrations = []
  const sentryConfig: SentryConfig = {
    dsn: modOption.dsn,
    debug: modOption.server.debug,
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

  // Init Server Sentry
  const cfg: SentryConfig = { integrations: sentryIntegrations }
  Object.assign(sentryConfig, cfg)
  init(sentryConfig)

  // App  Error Caputure
  nitroApp.hooks.hook('error', (error) => {
    if (error instanceof H3Error) {
      if (error.statusCode === 404 || error.statusCode === 422)
        return
    }
    captureException(error)
  })
})
