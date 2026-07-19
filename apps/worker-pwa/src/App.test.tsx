import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import './i18n';
import App from './App';

describe('App', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders the login form when no access token is stored', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the camera check button once authenticated', () => {
    localStorage.setItem('gs_erp_access_token', 'test-access-token');
    render(<App />);
    expect(screen.getByRole('button', { name: /check camera/i })).toBeInTheDocument();
  });
});
