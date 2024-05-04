<template>
  <div>
    Nuxt module playground!
    <div>
      <input
        type="button"
        value="CREATE ERROR"
        @click="handler"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
await $fetch('/api/')

function handler() {
  console.log('press')
  throw createError({
    message: 'Browser Error',
  })
}
</script>
