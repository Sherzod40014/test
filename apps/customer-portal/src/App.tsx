import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@erp/shared-ui-kit';

function App() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <LanguageSwitcher />
      <p>{t('portal.comingSoon')}</p>
    </div>
  );
}

export default App;
