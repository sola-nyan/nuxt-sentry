# @sola-nyan/nuxt-sentry

Experimental repository.

## Features

Integrate Sentry to Nuxt3 client/server side.

## Quick Setup

Install the module to your Nuxt application with one command:

1. Install Package
```bash
npm install @solanyan/nuxt-sentry
```

2. (Required) Add .env some parameter.
```bash
SENTRY_DSN=<PLACE SENTRY DSN>
SENTRY_ORG=<PLACE ORGANIZATION NAME>
SENTRY_PROJECT=<PLACE PROJECT NAME>
SENTRY_RELEASE=<PLACE RELEASE NAME>
SENTRY_AUTH_TOKEN=<PLACE SENTERY AUTH TOKEN>
```

2. (Optional) Edit nuxt.config.ts parameter, if you want to change default setting.
```bash
export default defineNuxtConfig({
  ...,
  sentry: {
    ignoreH3statusCode: [404, 202], // No report if H3Error status code is.
    client: { // about @sentry/vue
      enable: true,                                     // Set false, Client side Sentry dont start.
      debug: false,                                     // Sentry debug mode. 
      browserTracingIntegration: {
        enable: true,                                   // Enable browserTracingIntegration
        tracesSampleRate: 1.0,                          // See Sentry Doc for detail.
        tracePropagationTargets: ['localhost', /^\//],  // See Sentry Doc for detail.
      },
      replayIntegration: {
        enable: true,                                   // Enable replayIntegration
        replaysSessionSampleRate: 0.1,                  // See Sentry Doc for detail.
        replaysOnErrorSampleRate: 1.0,                  // See Sentry Doc for detail.
      },      
    },
    server: { // about @sentry/node
      enable: true,                                     // Set false, Server side Sentry dont start.
      debug: false,                                     // Sentry debug mode.
      tracesSampleRate: 1.0                             // See Sentry Doc for detail.
      autoDiscover: { // about Sentry.autoDiscoverNodePerformanceMonitoringIntegrations()     
        enable : true,                                  // See Sentry Doc for detail.
      },      
    },
    sourceMap: { // about @sentry/vite-plugin
      enable: true,                                     // Set false, need to upload sourcemap your self. 
      debug: false,                                     // Sentry debug mode. (@sentry/vite-plugin)
      filesToDeleteAfterUpload: ['.output/**/*.map'],   // See Sentry Doc for detail.
      telemetryOmit: true,                              // See Sentry Doc for detail.
    },    
  },
  ...,
})
```

