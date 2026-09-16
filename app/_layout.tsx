import { Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { View } from 'react-native';

import { SessionProvider } from '../data/useSession';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
