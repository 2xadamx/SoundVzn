import { usePlayerStore } from '../store/player';
import { translate, TranslationKey } from '@utils/i18n';

export function useTranslation() {
  const language = usePlayerStore((state) => state.language);
  return {
    language,
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(key, language, params),
  };
}
