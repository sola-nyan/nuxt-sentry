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
      autoDiscover: {
        enable: false,
      },
    },
  },
  devtools: { enabled: true },
})
