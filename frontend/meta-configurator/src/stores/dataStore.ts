import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const dataStore = defineStore('dataStore', () => {

  const configData = ref( { "SomeKey": "someValue"} )


  return { configData }
})
