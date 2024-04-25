export default defineNuxtConfig({
  modules: ['../src/module'],
  ssr: true,
  sentry: {
    client: {
      enable: true,
    },
    server: {
      enable: true,
    },
  },
  devtools: { enabled: true },
})
