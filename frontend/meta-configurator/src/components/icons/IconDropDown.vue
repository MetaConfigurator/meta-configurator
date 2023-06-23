<template>
  <div>
    <Dropdown
      v-model="selectedOption"
      :options="options"
      optionLabel="label"
      placeholder="Select an language"
      class="w-full md:w-14rem">
      <template #option="optionProps">
        <li @click="handleOptionClick(optionProps.option)">
          {{ optionProps.option.label }}
        </li>
      </template>
    </Dropdown>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import Dropdown from 'primevue/dropdown';
import {PrimeIcons} from 'primevue/api';

interface Option {
  label: string;
  value: string;
  icon?: string;
}

export default defineComponent({
  components: {
    Dropdown,
  },
  data() {
    return {
      selectedOption: null as Option | null,
      options: [
        {label: 'JSON', value: 'option1', icon: PrimeIcons.CHECK},
        {label: 'YAML', value: 'option2', icon: PrimeIcons.CHECK},
      ] as Option[],
    };
  },
  methods: {
    handleOptionClick(option: Option) {
      // Handle the option click event here
      console.log('Clicked option:', option);
    },
  },
});
</script>

<style>
/* Add any custom styles here */
</style>
