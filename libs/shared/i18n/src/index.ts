import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';
import zh from './locales/zh.json';

export type SupportedLanguage = 'en' | 'ru' | 'uz' | 'zh';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ru', 'uz', 'zh'];

export const i18nResources: Record<SupportedLanguage, { translation: Record<string, string> }> = {
  en: { translation: en },
  ru: { translation: ru },
  uz: { translation: uz },
  zh: { translation: zh },
};
