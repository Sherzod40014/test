import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@erp/shared-i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => {
        const isActive = i18n.language === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => i18n.changeLanguage(lang)}
            style={{
              padding: '6px 12px',
              fontWeight: isActive ? 700 : 400,
              backgroundColor: isActive ? '#1d4ed8' : '#e5e7eb',
              color: isActive ? '#ffffff' : '#111827',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
