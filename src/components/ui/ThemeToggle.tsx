import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  /** 'sidebar' (default): full-width pill inside the dark sidebar
   *  'topbar': compact icon-only button for the light topbar */
  placement?: 'sidebar' | 'topbar';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ placement = 'sidebar' }) => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  if (placement === 'topbar') {
    return (
      <button
        onClick={() => setIsDark(prev => !prev)}
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
          el.style.borderColor = '#C4836A';
          el.style.color = '#C4836A';
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
      onClick={() => setIsDark(prev => !prev)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: 'rgba(196,131,106,0.08)',
        border: '0.5px solid rgba(196,131,106,0.20)',
        borderRadius: '4px',
        color: '#C4836A',
        padding: '6px 12px',
        cursor: 'pointer',
        fontFamily: "'DM Mono', monospace",
        fontSize: '8px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        transition: 'background 0.18s, border-color 0.18s',
        width: '100%',
        maxWidth: '140px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,131,106,0.14)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,131,106,0.08)';
      }}
    >
      {isDark ? <Sun size={11} strokeWidth={1.5} /> : <Moon size={11} strokeWidth={1.5} />}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
