import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useOnboardingState } from '../data/useOnboardingState';

export default function Home() {
  const onboarding = useOnboardingState();

  switch (onboarding.status) {
    case 'loading':
      return <View style={{ flex: 1 }} />;
    case 'signed-out':
      return <Redirect href="/(auth)/sign-in" />;
    case 'needs-consent':
      return <Redirect href="/(auth)/consent" />;
    case 'needs-child':
      return <Redirect href="/(auth)/add-child" />;
    case 'needs-rules':
      return <Redirect href="/(auth)/propose-rules" />;
    case 'needs-rewards':
      return <Redirect href="/(auth)/propose-rewards" />;
    case 'needs-threshold':
      return <Redirect href="/(auth)/set-threshold" />;
    case 'ready':
      return <Redirect href="/(main)/today" />;
  }
}
