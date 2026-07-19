import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import './i18n';
import App from './App';

describe('App', () => {
  it('renders the placeholder customer portal shell', () => {
    render(<App />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('Customer portal coming soon')).toBeInTheDocument();
  });
});
