import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ppp65isking.arenaforge',
  appName: 'Arena Forge',
  webDir: 'dist',
  bundledWebRuntime: false,
  // Status-bar gray fix (2026-11-19): the WebView background before first
  // paint is white by default — paint the app's dark blue instead so no
  // light flash shows around the camera cutout / status bar.
  android: {
    backgroundColor: '#06101f',
  },
};

export default config;
