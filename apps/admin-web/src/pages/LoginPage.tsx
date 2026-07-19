import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, LanguageSwitcher } from '@erp/shared-ui-kit';
import { login } from '@erp/shared-api-client';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      // Both invalid-credential (401) and unexpected errors show the same generic message --
      // we never reveal to the client why authentication failed.
      setError(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <LanguageSwitcher />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 360,
          padding: 32,
          borderRadius: 12,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 24px' }}>{t('app.title')}</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}
            >
              {t('auth.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? '…' : t('auth.signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
