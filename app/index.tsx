import { Redirect } from 'expo-router';

import { useAuth } from '@/contextes/contexteAuth';

export default function Index() {
  const { state } = useAuth();

  if (state === 'loading') return null;

  return <Redirect href={state === 'authenticated' ? '/(tabs)/home' : '/(auth)/login'} />;
}
