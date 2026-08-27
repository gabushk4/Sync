//Gabirel Pereira Levesque

import Colors from '@/constants/Colors';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function AuthLayout() {
    const colorScheme = useColorScheme()
  return (
    <Stack
      screenOptions={{headerBackButtonDisplayMode:'minimal', headerBackVisible:false}}
    >
      <Stack.Screen name="login" options={{ headerTitle:'Connexion', }} />
      <Stack.Screen name="register" options={{ headerTitle: 'Inscription'}} />
    </Stack>
  );
}