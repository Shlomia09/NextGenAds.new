import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cssToken } from '../../lib/cssToken';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  /** 'sidebar' (default): full-width pill inside the dark sidebar
   *  'topbar': compact icon-only button for the light topbar */
  placement?: 'sidebar' | 'topbar';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ placement = 'sidebar' }) => {
  // Theme lives in ThemeContext, which also persists it — no local copy here.
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  if (placement === 'topbar') {
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: '0.5px solid var(--color-border-default)',
          borderRadius: '4px',
          color: 'var(--color-text-secondary)',
          width: '28px',
          height: '28px',
          cursor: 'pointer',
          transition: 'border-color 0.18s, color 0.18s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = cssToken('--accent');
          el.style.color = cssToken('--accent');
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = 'var(--color-border-default)';
          el.style.color = 'var(--color-text-secondary)';
        }}
      >
        {isDark ? <Sun size={12} strokeWidth={1.5} /> : <Moon size={12} strokeWidth={1.5} />}
      </button>
    );
  }

  // placement === 'sidebar' (default)
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: 'var(--accent-soft)',
        border: '0.5px solid var(--accent-soft)',
        borderRadius: '4px',
        color: 'var(--text)',
        padding: '6px 12px',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: '8px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        transition: 'background 0.18s, border-color 0.18s',
        width: '100%',
        maxWidth: '140px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-soft)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-soft)';
      }}
    >
      {isDark ? <Sun size={11} strokeWidth={1.5} /> : <Moon size={11} strokeWidth={1.5} />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
