<script setup lang="ts">
import SchemaInfoPanel from '@/components/panels/gui-editor/SchemaInfoPanel.vue';
import CurrentPathBreadcrumb from '@/components/panels/shared-components/CurrentPathBreadcrump.vue';
import PropertiesPanel from '@/components/panels/gui-editor/PropertiesPanel.vue';
import type {Path} from '@/utility/path';
import {computed} from 'vue';
import {JsonSchemaWrapper} from '@/schema/jsonSchemaWrapper';
import {
  getDataForMode,
  getSchemaForMode,
  getSessionForMode,
  useCurrentSchema,
} from '@/data/useDataLink';
import type {SessionMode} from '@/store/sessionMode';
import {dataPathToSchemaPath} from '@/utility/pathUtils';
import _ from 'lodash';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

const session = getSessionForMode(props.sessionMode);
const data = getDataForMode(props.sessionMode);

function updatePath(newPath: Path) {
  session.updateCurrentPath(newPath);
}

function updateData(path: Path, newValue: any) {
  if (path.length > 0) {
    const dataAtPath = data.dataAt(path);

    if (dataAtPath == null) {
      // if the element is new, we add it to the parent object in a sorted way
      const parentPath = path.slice(0, path.length - 1);
      const parentSchemaPath = dataPathToSchemaPath(parentPath);
      const parentSchemaProps = getSchemaForMode(props.sessionMode).effectiveSchemaAtPath(
        parentSchemaPath
      ).schema.properties;
      const parentData = structuredClone(data.dataAt(parentPath));
      if (!_.isEmpty(parentSchemaProps) && !_.isEmpty(parentData)) {
        // only proceed with property sorting when parent schema and data are not empty
        // warning: this function only works for normal properties, not for composition, conditionals and other advanced features
        // for those advanced features, the new property will be added at the end of the object
        // TODO: implement sorting for advanced features. This will be more complicated and will require a lot of testing
        const schemaKeys = Object.keys(parentSchemaProps);
        const dataKeys = Object.keys(parentData);
        const newElementKey = path[path.length - 1];
        parentData[newElementKey] = newValue; // Add the new property

        // sort the document properties based on the order of schema properties
        const sortedProperties: {[key: string]: any} = {};
        schemaKeys.forEach(key => {
          if (dataKeys.includes(key) || key === newElementKey) {
            sortedProperties[key] = parentData[key];
          }
        });
        // after adding properties from the schema in proper order, add the rest of the properties
        dataKeys.forEach(key => {
          if (!schemaKeys.includes(key)) {
            sortedProperties[key] = parentData[key];
          }
        });

        // if properties were sorted, update the parent object instead of the new property
        path = parentPath;
        newValue = sortedProperties;
      }
    }
  }

  data.setDataAt(path, newValue);
}

function removeProperty(path: Path) {
  data.removeDataAt(path);
  session.updateCurrentSelectedElement(path);
}

function zoomIntoPath(pathToAdd: Path) {
  session.updateCurrentPath(session.currentPath.value.concat(pathToAdd));
  session.updateCurrentSelectedElement(session.currentPath.value);
}

function selectPath(path: Path) {
  session.updateCurrentSelectedElement(path);
}

const currentSchema = computed(() => {
  const schema = session.effectiveSchemaAtCurrentPath?.value.schema;
  if (!schema) {
    return new JsonSchemaWrapper({}, props.sessionMode, false);
  }
  return schema;
});
</script>

<template>
  <div class="p-5 space-y-3 flex flex-col">
    <SchemaInfoPanel :sessionMode="props.sessionMode" />
    <CurrentPathBreadcrumb
      :session-mode="props.sessionMode"
      :root-name="'document root'"
      :path="session.currentPath.value"
      @update:path="newPath => updatePath(newPath)" />
    <div class="flex-grow overflow-y-auto">
      <PropertiesPanel
        :currentSchema="currentSchema"
        :currentPath="session.currentPath.value"
        :currentData="session.dataAtCurrentPath.value"
        :sessionMode="props.sessionMode"
        @zoom_into_path="pathToAdd => zoomIntoPath(pathToAdd)"
        @remove_property="removeProperty"
        @select_path="selectedPath => selectPath(selectedPath)"
        @update_data="updateData" />
    </div>
  </div>
</template>

<style scoped></style>
