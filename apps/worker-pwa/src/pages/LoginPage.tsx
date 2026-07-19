import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@erp/shared-ui-kit';
import { login } from '@erp/shared-api-client';

export interface LoginPageProps {
  onLoggedIn?: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const { t } = useTranslation();

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
      onLoggedIn?.();
    } catch {
      // Same generic message regardless of cause -- never reveal which part was wrong.
      setError(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

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
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}
            >
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
                padding: '1rem',
                fontSize: '1.1rem',
                borderRadius: '0.75rem',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}
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
                padding: '1rem',
                fontSize: '1.1rem',
                borderRadius: '0.75rem',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: '#dc2626', fontWeight: 600, marginBottom: '1rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '1.25rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: '0.75rem',
              border: 'none',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {isLoading ? '…' : t('auth.signIn')}
          </button>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
