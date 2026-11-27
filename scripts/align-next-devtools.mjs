import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const configPath = resolve('.next', 'dev', 'cache', 'next-devtools-config.json');
const panelNames = [
  'preferences',
  'route-type',
  'segment-explorer',
  'instant-navs',
  'request-insights',
  'cache-disabled',
  'cold-cache',
];

let config = {};

try {
  config = JSON.parse(await readFile(configPath, 'utf8'));
} catch {
  // Next creates this file on the first dev start.
}

const devToolsPanelPosition = {
  ...(config.devToolsPanelPosition ?? {}),
  '__nextjs-dev-tools-shared-panel-location': 'bottom-right',
};

for (const panelName of panelNames) {
  devToolsPanelPosition[`__nextjs-dev-tools-panel-position_${panelName}`] = 'bottom-right';
}

await mkdir(dirname(configPath), { recursive: true });
await writeFile(
  configPath,
  `${JSON.stringify(
    {
      ...config,
      devToolsPosition: 'bottom-right',
      devToolsPanelPosition,
    },
    null,
    2,
  )}\n`,
);
