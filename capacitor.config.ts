import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craznail.memorytrain',
  appName: '听力记忆训练',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};

export default config;
