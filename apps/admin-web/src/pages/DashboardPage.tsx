import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, LanguageSwitcher } from '@erp/shared-ui-kit';
import { logout } from '@erp/shared-api-client';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>{t('app.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LanguageSwitcher />
          <Button onClick={handleSignOut} style={{ minHeight: 36, padding: '8px 16px' }}>
            {t('common.logout')}
          </Button>
        </div>
      </header>

      <div style={{ display: 'flex' }}>
        <nav
          style={{
            width: 220,
            minHeight: 'calc(100vh - 61px)',
            padding: '24px 16px',
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            <li>
              <Link
                to="/warehouses"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 6,
                  color: '#0f172a',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {t('nav.warehouse')}
              </Link>
            </li>
            <li>
              <Link
                to="/customers"
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 6,
                  color: '#0f172a',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {t('nav.customers')}
              </Link>
            </li>
          </ul>
        </nav>

        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
