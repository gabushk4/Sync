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
    </Stack>
  );
}