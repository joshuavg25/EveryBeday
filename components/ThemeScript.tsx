'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';

// Applies the saved theme before the first paint, so a dark-mode user never sees a light flash.
// It only needs to run on the first page load: the attribute it sets on <html> stays across
// navigations, and ThemeProvider keeps it in sync afterwards.
const themeScript = `
  try {
    var savedTheme = localStorage.getItem('everybeday-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.dataset.theme = savedTheme;
    }
  } catch {}
`;

// useServerInsertedHTML puts the script in the server HTML only. Rendering a plain <script> in
// the layout would make React warn when the layout re-renders on the client (e.g. switching language).
export function ThemeScript() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeScript }} />;
  });
  return null;
}
