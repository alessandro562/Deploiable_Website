import { defineConfig } from '@playwright/test';

// Chromium preinstallato; WebGL via SwiftShader (renderer software) con il livello di qualità minimo.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
