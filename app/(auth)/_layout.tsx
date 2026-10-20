//Gabirel Pereira Levesque

import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
    const { t } = useTranslation('auth')
  return (
    <Stack
      screenOptions={{headerBackButtonDisplayMode:'minimal', headerBackVisible:false}}
    >
      <Stack.Screen name="login" options={{ headerTitle: t('navigation.login'), }} />
      <Stack.Screen name="register" options={{ headerTitle: t('navigation.register')}} />
      {/* "Forgot password" sheet (ModalBase) over the login screen. Philip — rectification. */}
      <Stack.Screen
        name="mdpOublie"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          animationDuration: 50,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}