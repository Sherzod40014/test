import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import './i18n';
import App from './App';

describe('App', () => {
  it('renders the camera check button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /check camera/i })).toBeInTheDocument();
  });
});
