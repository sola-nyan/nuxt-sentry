import { defineNuxtModule, addPlugin, createResolver, useLogger, isNuxt3, addVitePlugin, addServerPlugin } from '@nuxt/kit'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const MODULE_NAME = '@solanyan/nuxt-sentry'

const logger = useLogger(`module:${MODULE_NAME}`)

// Module options TypeScript interface definition
export interface ModuleOptions {
  dsn?: string
  release?: string
  ignoreH3statusCode?: number[]
  client?: {
    enable: boolean
    debug?: boolean
    browserTracingIntegration?: {
      enable: boolean
      tracesSampleRate?: number
      tracePropagationTargets?: (RegExp | string)[]
    }
    replayIntegration?: {
      enable: boolean
      replaysSessionSampleRate?: number
      replaysOnErrorSampleRate?: number
    }
  }
  server?: {
    enable: boolean
    debug?: boolean
    // nodeProfilingIntegration?: {
    //   enable: boolean
    //   tracesSampleRate?: number
    //   profilesSampleRate?: number
    // }
  }
  sourceMap?: {
    enable: boolean
    debug?: boolean
    filesToDeleteAfterUpload?: string[]
    telemetryOmit?: boolean
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: 'sentry',
    compatibility: {
      nuxt: '^3.11.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    dsn: '',
    release: '',
    ignoreH3statusCode: [404, 202],
    client: {
      enable: true,
      debug: false,
      browserTracingIntegration: {
        enable: true,
        tracesSampleRate: 1.0,
        tracePropagationTargets: ['localhost', /^\//],
      },
      replayIntegration: {
        enable: true,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      },
    },
    server: {
      enable: true,
      debug: false,
      // nodeProfilingIntegration: {
      //   enable: true,
      //   tracesSampleRate: 1.0,
      //   profilesSampleRate: 0.1,
      // },
    },
    sourceMap: {
      enable: true,
      debug: false,
      filesToDeleteAfterUpload: ['.output/**/*.map'],
      telemetryOmit: true,
    },
  },
  setup(modOption, _nuxt) {
    // Nuxt version check
    if (!isNuxt3()) {
      logger.warn('This module suppurts only Nuxt3, module disabled.')
      return
    }

    // DSN Setting Assert
    if (!modOption.dsn) {
      // Try to get from process.ENV.SENTRY_DSN
      if (process.env.SENTRY_DSN) {
        modOption.dsn = process.env.SENTRY_DSN
      }
      else {
        logger.warn('Nuxt Sentry DSN(sentry.dsn) is not set, module disabled.')
        return
      }
    }

    // Release name Setting Assert
    if (!modOption.release) {
      // Try to get from process.ENV.SENTRY_RELEASE
      if (process.env.SENTRY_RELEASE) {
        modOption.release = process.env.SENTRY_RELEASE
      }
      else {
        logger.warn('Nuxt Sentry Release Name(sentry.release) is not set, module disabled.')
        return
      }
    }

    // Sourcemap Setting Assert
    if (modOption.sourceMap?.enable) {
      // SENTRY AUTH TOKEN assert
      if (!process.env.SENTRY_AUTH_TOKEN) {
        logger.warn('Environment value of SENTRY_AUTH_TOKEN is not set, module disabled.')
        return
      }

      // Org. name
      if (!process.env.SENTRY_ORG) {
        logger.warn('Environment value of SENTRY_ORG is not set, module disabled.')
        return
      }

      // Project name
      if (!process.env.SENTRY_PROJECT) {
        logger.warn('Environment value of SENTRY_PROJECT is not set, module disabled.')
        return
      }
    }

    // Path Resolver Create
    const resolver = createResolver(import.meta.url)

    // Exposing Options to Runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _nuxt.options.runtimeConfig.public.sentry = modOption as any // Need 'as any', Due to Nuxt3 upstream typing "BUG" (https://github.com/nuxt/nuxt/issues/8985)

    // Add sourcemap upload plugin with Vite
    if (modOption.sourceMap?.enable) {
      // Vite reconfig

      // Force generate client sourcemap
      if (modOption.client?.enable)
        _nuxt.options.sourcemap.client = true
      if (modOption.server?.enable)
        _nuxt.options.sourcemap.client = true

      // Install plugin
      addVitePlugin(() => sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: !modOption.sourceMap?.telemetryOmit,
        debug: modOption.sourceMap?.debug,
        sourcemaps: {
          filesToDeleteAfterUpload: modOption.sourceMap?.filesToDeleteAfterUpload,
        },
      }))
    }

    // Setup for client
    if (modOption.client?.enable) {
      // Install Plugin
      addPlugin({
        src: resolver.resolve('./runtime/sentry.client'),
        mode: 'client',
      })
    }

    // Setup for server
    if (modOption.client?.enable) {
      // Install Plugin
      addServerPlugin(resolver.resolve('./runtime/sentry.server'))
    }
  },
})
