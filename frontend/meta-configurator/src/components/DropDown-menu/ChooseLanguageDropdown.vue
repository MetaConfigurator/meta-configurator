<template>
  <div>
    <Dropdown v-model="selectedOption" :options="options" optionLabel="label" placeholder="Select an option" class="w-full md:w-14rem">
      <template #option="{ option }">
        <li @click="handleOptionClick(option)">
          {{ option?.label }}
        </li>
      </template>
    </Dropdown>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue';
import Dropdown from 'primevue/dropdown';
import { PrimeIcons } from 'primevue/api';

interface Option {
  label: string;
  value: string;
  icon?: string;
}

export default defineComponent({
  setup() {
    const selectedOption = ref<Option | null>(null);
    const options = ref<Option[]>([
      { label: 'JSON', value: 'option1', icon: PrimeIcons.CHECK },
      { label: 'YAML', value: 'option2', icon: PrimeIcons.CHECK },
    ]);

    const handleOptionClick = (option: Option) => {
      // Handle the option click event here
      console.log('Clicked option:', option);
    };

    return {
      selectedOption,
      options,
      handleOptionClick,
    };
  },
  components: {
    Dropdown,
  },
});
</script>

<style>
/* Add any custom styles here */
</style>
