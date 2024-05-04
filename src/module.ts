import { defineNuxtModule, addPlugin, createResolver, useLogger, isNuxt3, addVitePlugin, addServerPlugin } from '@nuxt/kit'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const MODULE_NAME = '@solanyan/nuxt-sentry'

const logger = useLogger(`module:${MODULE_NAME}`)

// Module options TypeScript interface definition
export interface ModuleOptions {
  dsn?: string
  release?: string
  project?: string
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
    tracesSampleRate?: number
    traceTargetPath?: string[]
    autoDiscoverIntegration?: {
      enable: boolean
    }
    customInst?: {
      enable: boolean
    }
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
      traceTargetPath: ['/api/'],
      tracesSampleRate: 1.0,
      autoDiscoverIntegration: {
        enable: false,
      },
      customInst: {
        enable: false,
      },
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
      logger.warn('[Sentry module is disabled] This module suppurts only Nuxt3')
      return
    }

    // Try to get from process.ENV.SENTRY_DSN
    if (process.env.SENTRY_DSN) {
      modOption.dsn = process.env.SENTRY_DSN
    }

    // Try to get from process.ENV.SENTRY_PROJECT
    if (process.env.SENTRY_PROJECT) {
      modOption.project = process.env.SENTRY_PROJECT
    }

    // DNS Setting Assert
    if (!modOption.dsn) {
      logger.warn('[Sentry module is disabled] Not found Environment value, SENTRY_DSN')
      return
    }

    // Project Setting Assert
    if (!modOption.project) {
      logger.warn('[Sentry module is disabled] Not found Environment value, SENTRY_PROJECT')
      return
    }

    // Release name Setting Assert
    if (!modOption.release) {
      // Try to get from process.ENV.SENTRY_RELEASE
      if (process.env.SENTRY_RELEASE) {
        modOption.release = process.env.SENTRY_RELEASE
      }
      else {
        logger.warn('[Sentry module is disabled] Not found Environment value of SENTRY_RELEASE')
        return
      }
    }

    // Sourcemap Setting Assert
    if (modOption.sourceMap?.enable) {
      // SENTRY AUTH TOKEN assert
      if (!process.env.SENTRY_AUTH_TOKEN) {
        logger.warn('[Sentry module is disabled] Not found Environment value of SENTRY_AUTH_TOKEN')
        return
      }

      // Org. name
      if (!process.env.SENTRY_ORG) {
        logger.warn('[Sentry module is disabled] Not found Environment value of SENTRY_ORG')
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
      // Force generate client sourcemap
      if (modOption.server?.enable)
        _nuxt.options.sourcemap.client = true
      // Force generate server sourcemap
      if (modOption.server?.enable)
        _nuxt.options.sourcemap.server = true
      // Install Plugin
      addVitePlugin(() => sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: modOption.project,
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
        src: resolver.resolve('./runtime/sentry.app.client'),
        mode: 'client',
      })
    }

    // Setup for server
    if (modOption.server?.enable) {
      // Install Plugin
      addServerPlugin(resolver.resolve('./runtime/sentry.nitro'))
    }
  },
})
