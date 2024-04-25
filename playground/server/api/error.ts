export default defineEventHandler(() => {
  throw createError({
    message: 'Something API error',
  })
})
