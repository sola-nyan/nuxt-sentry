export default defineEventHandler(() => {
  throw createError({
    message: 'Something API error',
    status: 500,
  })
})
