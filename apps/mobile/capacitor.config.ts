import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chauhan.erp',
  appName: 'Chauhan Scanner',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
