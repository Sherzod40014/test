import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@erp/shared-ui-kit';
import { CameraCheck } from './components/CameraCheck';

function App() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '1rem',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('app.title')}</h1>
        <LanguageSwitcher />
      </header>

      <main style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: '1rem', lineHeight: 1.5 }}>{t('worker.placeholder')}</p>
        <CameraCheck />
      </main>
    </div>
  );
}

export default App;
