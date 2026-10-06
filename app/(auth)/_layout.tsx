//Gabirel Pereira Levesque

import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

export default function AuthLayout() {
    const colorScheme = useColorScheme()
  const { t } = useTranslation('auth')
  return (
    <Stack
      screenOptions={{headerBackButtonDisplayMode:'minimal', headerBackVisible:false}}
    >
      <Stack.Screen name="login" options={{ headerTitle: t('navigation.login'), }} />
      <Stack.Screen name="register" options={{ headerTitle: t('navigation.register')}} />
      {/* Lives in (auth) rather than (modals): the (modals) group is guarded by
          state === 'authenticated' in app/_layout.tsx, so pushing it from login was a no-op. */}
      <Stack.Screen
        name="mdpOublie"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}