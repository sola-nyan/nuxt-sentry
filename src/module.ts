import { defineNuxtModule, addPlugin, createResolver, useLogger, isNuxt3, addVitePlugin } from '@nuxt/kit'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const MODULE_NAME = '@sola-nyan/nuxt-sentry'

const logger = useLogger(`module:${MODULE_NAME}`)

// Module options TypeScript interface definition
export interface ModuleOptions {
  dsn: string
  enable: boolean
  ignoreH3statusCode: number[]
  client: {
    enable: boolean
    debug: boolean
    browserTracingIntegration: {
      enable: boolean
      tracesSampleRate: number
      tracePropagationTargets: (RegExp | string)[]
    }
    replayIntegration: {
      enable: boolean
      replaysSessionSampleRate: number
      replaysOnErrorSampleRate: number
    }
  }
  server: {
    enable: boolean
    debug: boolean
    nodeProfilingIntegration: {
      enable: boolean
      tracesSampleRate: number
      profilesSampleRate: number
    }
  }
  sourceMap: {
    enable: boolean
    org: string
    project: string
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
    enable: true,
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
      nodeProfilingIntegration: {
        enable: true,
        tracesSampleRate: 1.0,
        profilesSampleRate: 0.1,
      },
    },
    sourceMap: {
      enable: true,
      org: '',
      project: '',
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
      logger.warn('Nuxt Sentry DSN(sentry.dsn) is not set, module disabled.')
      return
    }

    // Sourcemap Setting Assert
    if (modOption.sourceMap.enable) {
      // SENTRY AUTH TOKEN assert
      if (!_nuxt.options.runtimeConfig.SENTRY_AUTH_TOKEN) {
        logger.warn('Environment value of SENTRY_AUTH_TOKEN is not set, module disabled.')
        return
      }

      // Org. name
      if (!modOption.sourceMap.org) {
        logger.warn('Sentry Organization ID(sentry.sourcemap.org) is not set, module disabled.')
        return
      }

      // Project name
      if (!modOption.sourceMap.org) {
        logger.warn('Sentry Project ID(sentry.sourcemap.project) is not set, module disabled.')
        return
      }
    }

    // Path Resolver Create
    const resolver = createResolver(import.meta.url)

    // Exposing Options to Runtime
    _nuxt.options.runtimeConfig.public.sentry = modOption

    // Add sourcemap upload plugin with Vite
    if (modOption.sourceMap.enable) {
      // Force generate client sourcemap
      _nuxt.options.sourcemap.client = true
      // Install plugin
      addVitePlugin(() => sentryVitePlugin({
        authToken: '',
        sourcemaps: {
          filesToDeleteAfterUpload: ['.output/**/*.map'],
        },
      }))
    }

    // Setup for client
    if (modOption.client.enable) {
      // Install Plugin
      addPlugin({
        src: resolver.resolve('./runtime/sentry.client'),
        mode: 'client',
      })
    }

    // Setup for server
    if (modOption.client.enable) {
      // Install Plugin
      addPlugin({
        src: resolver.resolve('./runtime/sentry.server'),
        mode: 'server',
      })
    }
  },
})
