export default defineNuxtConfig({
  modules: ['../src/module'],
  sentry: {
    dsn: '',
    enable: true,
  },
  devtools: { enabled: true },
})
