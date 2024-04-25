export default defineNuxtConfig({
  modules: ['../src/module'],
  sentry: {
    enable: true,
  },
  devtools: { enabled: true },
})
