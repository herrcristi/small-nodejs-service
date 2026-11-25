import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Api from '../api/api.js';

/**
 * the agreements and their documents (the legal documents), in the language of the UI: read when the component is
 * mounted and again when the language changes (the request has the language of the UI)
 * returns { agreements: [ { name, version, documents: [ { name, title, blocks } ] } ], error, load }
 */
export function useAgreements() {
  const { locale } = useI18n();
  const agreements = ref([]);
  const error = ref(false);

  async function load() {
    try {
      const response = await Api.getAgreements();
      agreements.value = response.data?.agreements || [];
      error.value = false;
    } catch (e) {
      console.error('The documents could not be loaded', e);
      error.value = true;
    }
  }

  onMounted(load);
  watch(locale, load);

  return { agreements, error, load };
}
