<!--
Dialog that shows information about the application and the licenses of the used icons.
Emits an update:visible event when the dialog is closed.
-->
<script setup lang="ts">
import Dialog from 'primevue/dialog';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';

defineProps<{visible: boolean}>();

defineEmits<{
  (e: 'update:visible', newValue: boolean): void;
}>();
</script>

<template>
  <Dialog
    header="About"
    :visible="visible"
    @update:visible="newValue => $emit('update:visible', newValue)">
    <p>
      MetaConfigurator is a form generator and schema editor for JSON schema, making editing
      configuration files, research data and schemas easier and more enjoyable.
    </p>
    <p>It is currently in alpha stage, so expect bugs and missing features.</p>
    <p>MetaConfigurator is open source and licensed under the MIT license.</p>
    <p>
      Check our
      <a
        class="underline text-violet-950"
        href="https://github.com/MetaConfigurator/meta-configurator"
        target="_blank"
        rel="noopener noreferrer">
        <span class="pi pi-github mr-1" />GitHub
      </a>
      for more information
    </p>
    <hr class="my-2" />
    <p>Felix Neubauer, Paul Bredl, Minye Xu, Keyuriben Patel, Jürgen Pleiss, Benjamin Uekermann</p>
    <p>Institute for Visualization and Interactive Systems, University of Stuttgart</p>
    <p>Universitätsstrasse 38D, 70569 Stuttgart, Germany</p>
    <hr class="my-2" />
    <p>Icons by FontAwesome <FontAwesomeIcon icon="fa-solid fa-font-awesome" /></p>
    <p>
      Licensed under
      <a class="underline text-violet-950" href="https://fontawesome.com/license/free">CC BY 4.0</a>
    </p>
    <hr class="my-2" />
    <p>Icons by PrimeIcons <span class="pi pi-prime mr-1" /></p>
    <p>
      Licensed under
      <a class="underline text-violet-950" href="https://www.primefaces.org/licenses/">MIT</a>
    </p>
    <hr class="my-2" />
    <p>Code Generation via quicktype</p>
    <p>
      Licensed under
      <a
        class="underline text-violet-950"
        href="https://github.com/glideapps/quicktype/blob/master/LICENSE"
        >Apache License 2.0</a
      >
    </p>
  </Dialog>
</template>

<style scoped></style>
