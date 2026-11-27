'use client';

import { useEffect } from 'react';

const STYLE_ID = 'everybeday-devtools-panel-alignment';

function alignPanels(root: ShadowRoot) {
  const menu = root.querySelector<HTMLElement>('#nextjs-dev-tools-menu');
  let style = root.querySelector<HTMLStyleElement>(`#${STYLE_ID}`);

  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    root.appendChild(style);
  }

  const panelPositionRule = menu
    ? (() => {
        const menuRect = menu.getBoundingClientRect();
        const right = Math.max(0, window.innerWidth - menuRect.right);
        const bottom = Math.max(0, window.innerHeight - menuRect.bottom);
        return `
          .dynamic-panel-container {
            right: ${right}px !important;
            bottom: ${bottom}px !important;
          }
        `;
      })()
    : '';

  style.textContent = `
    ${panelPositionRule}
  `;
}

function findDevToolsRoots() {
  const roots: ShadowRoot[] = [];
  const visit = (root: Document | ShadowRoot) => {
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
        visit(element.shadowRoot);
      }
    }
  };

  visit(document);
  return roots;
}

export function DevToolsPanelAlignment() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    let frame = 0;
    const update = () => {
      frame = 0;
      for (const root of findDevToolsRoots()) alignPanels(root);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new MutationObserver(scheduleUpdate);

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
