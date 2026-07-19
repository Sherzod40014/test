import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { i18nResources, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@erp/shared-i18n';

i18next.use(initReactI18next).init({
  resources: i18nResources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18next;
