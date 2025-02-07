import {computed} from "vue";

export const isDarkMode = computed(() => window.matchMedia("(prefers-color-scheme: dark)").matches);