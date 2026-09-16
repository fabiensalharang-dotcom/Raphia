import type { ExpoConfig } from 'expo/config';

// Le nom commercial est provisoire (voir CLAUDE.md) : app-name.json est
// l'unique source de cette chaîne, partagée avec la clé i18n app.name
// (i18n/fr-FR/common.ts). Un changement de nom se résume à modifier ce
// seul fichier JSON.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appName: string = require('./app-name.json').value;

const config: ExpoConfig = {
  name: appName,
  slug: 'tableau-comportement',
  scheme: 'tableaucomportement',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'fr.fsal.tableaucomportement',
    supportsTablet: true,
    // L'app n'utilise que le chiffrement standard fourni par iOS (HTTPS via
    // le client Supabase) — aucune cryptographie propriétaire. Déclarer ça
    // une fois ici évite qu'App Store Connect ne repose la question (et le
    // sous-flux de déclaration française) à chaque nouvel envoi.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'fr.fsal.tableaucomportement',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'f7d4c2cf-5187-4fd5-8508-eddd971b1d05',
    },
  },
  plugins: [
    'expo-router',
    '@react-native-community/datetimepicker',
    'expo-font',
    'expo-asset',
    ['expo-notifications', { icon: './assets/icon.png' }],
    'expo-sharing',
  ],
};

export default config;
