'use client';

import { useEffect } from 'react';

function applyTimeTheme() {
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;
  document.documentElement.dataset.theme = isNight ? 'dark' : 'light';
}

export default function Theme() {
  useEffect(() => {
    applyTimeTheme();
    const id = window.setInterval(applyTimeTheme, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
