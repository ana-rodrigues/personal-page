'use client';

// TEMPORARY — for locally testing theme-reactive components (e.g. PixelNoise's
// palette). Not wired into any design, no styling polish. Remove this file
// and its import in app/layout.tsx once testing is done.

import { useEffect, useState } from 'react';

type ThemeOverride = 'system' | 'light' | 'dark';

const NEXT: Record<ThemeOverride, ThemeOverride> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export default function DevThemeToggle() {
  const [theme, setTheme] = useState<ThemeOverride>('system');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'light' || current === 'dark' ? current : 'system');
  }, []);

  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    if (next === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = next;
    }
  };

  return (
    <button
      type="button"
      onClick={cycle}
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        padding: '6px 10px',
        fontSize: 12,
        fontFamily: 'monospace',
        background: '#000',
        color: '#fff',
        border: '1px solid #fff',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      theme: {theme}
    </button>
  );
}
