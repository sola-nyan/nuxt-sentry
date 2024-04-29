export default defineNuxtConfig({
  modules: ['../src/module'],
  ssr: false,
  sentry: {
    client: {
      enable: false,
    },
    server: {
      enable: true,
      debug: true,
      autoDiscoverIntegration: {
        enable: false,
      },
      customInst: {
        enable: true,
      },
    },
  },
  devtools: { enabled: true },
})
