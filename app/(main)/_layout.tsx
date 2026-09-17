import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { ActiveChildProvider } from '../../data/activeChild';
import { strings } from '../../i18n/fr-FR';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function MainLayout() {
  return (
    <ActiveChildProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
          tabBarStyle: { height: 72, paddingBottom: 10, paddingTop: 8 },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: strings['nav.today'],
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: strings['nav.progress'],
            tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="pilotage"
          options={{
            title: strings['nav.pilotage'],
            tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="bilan"
          options={{
            title: strings['nav.bilan'],
            tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="parametres"
          options={{
            title: strings['nav.parametres'],
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />
      </Tabs>
    </ActiveChildProvider>
  );
}
