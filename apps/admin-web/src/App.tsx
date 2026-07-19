import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@erp/shared-ui-kit';

function App() {
  const { t } = useTranslation();

  return (
    <div>
      <header>
        <h1>{t('app.title')}</h1>
        <LanguageSwitcher />
      </header>
      <main>
        <p>{t('admin.placeholder')}</p>
      </main>
    </div>
  );
}

export default App;
