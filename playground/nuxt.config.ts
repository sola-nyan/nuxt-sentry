export default defineNuxtConfig({
  modules: ['../src/module'],
  ssr: false,
  sentry: {
    client: {
      enable: false,
      debug: true,
    },
    server: {
      enable: true,
      debug: true,
      autoDiscoverIntegration: {
        enable: true,
      },
      customInst: {
        enable: true,
      },
    },
  },
  devtools: { enabled: true },
})
