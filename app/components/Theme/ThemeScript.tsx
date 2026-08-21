import Script from 'next/script';

const THEME_SCRIPT = `
(function () {
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;
  document.documentElement.dataset.theme = isNight ? 'dark' : 'light';
})();
`;

export default function ThemeScript() {
  return (
    <Script
      id="theme-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
