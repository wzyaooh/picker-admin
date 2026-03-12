import { ref, onMounted } from 'vue';
import { getDictOptions } from '#/utils/dict';
import type { SelectOption } from '#/utils/dict';

/**
 * 字典 Composable
 * 用于在组件中方便地加载和使用字典
 * 
 * @param code 字典编码
 * @returns 字典选项、加载状态和重新加载函数
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useDict } from '#/composables/use-dict';
 * import { DICT_CODES } from '#/utils/dict';
 * 
 * const { options, loading } = useDict(DICT_CODES.PERMISSION_TYPE);
 * </script>
 * 
 * <template>
 *   <NSelect v-model:value="type" :options="options" :loading="loading" />
 * </template>
 * ```
 */
export function useDict(code: string) {
  const options = ref<SelectOption[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      options.value = await getDictOptions(code);
    } catch (error) {
      console.error(`Failed to load dict: ${code}`, error);
      options.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    load();
  });

  return {
    options,
    loading,
    reload: load,
  };
}
