import React, { useEffect } from 'react';

//Providers
import { APIProvider, useAPI } from '@/contextes/contexteAPI';
import { FontProvider, useFont } from '@/contextes/contexteFont';
import { MembreProvider, useMembre } from '@/contextes/contexteMembre';
import { ModalProvider } from '@/contextes/contexteModals';
import { FabProvider as NavFABProvider } from '@/contextes/contexteNavFAB';
import { FabProvider as ActionFABProvider } from '@/contextes/contextActionFAB'
import { PaletteProvider, usePalette } from '@/contextes/contextePalette';
import { RouteAbsProvider } from '@/contextes/contexteRoute';
import { AccessTokenProvider, useAccessToken } from '@/contextes/contexteToken';
import { ThemeProvider } from "expo-router/react-navigation";

//Contexts

//Dependencies
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Stack, useRouter, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { DateTime } from 'luxon';
import 'react-native-reanimated';

//Components
import ToastAvertissement from '@/components/toastAvertissement';
import ToastErreur from '@/components/toastErreur';
import ToastSucces from '@/components/toastSucces';
import Toast from 'react-native-toast-message';

//Functions
import { GestionScrollProvider } from '@/contextes/contexteGestionListes';
import { InvitesProvider } from '@/contextes/contexteInvites';
import { TimelineProvider } from '@/contextes/contexteTimeline';
import catcher from '@/functions/catcher';
import log from '@/functions/log';

import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contextes/contexteAuth';
import ChargementEcran from '@/components/chargementEcran';
import { NotificationProvider } from '@/contextes/contexteNotifications';
import { MockModeProvider } from '@/contextes/contexteMockMode';

import {toastConfig} from '@/constants/toastConfig';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});



export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PaletteProvider>
      <FontProvider>
        <AccessTokenProvider>
          <MockModeProvider>
            <APIProvider>
              <MembreProvider>
                <AuthProvider> 
                  <NotificationProvider>
                    <RouteAbsProvider>
                      <ModalProvider>                  
                        <NavFABProvider>
                          <ActionFABProvider>
                            <TimelineProvider>
                              <GestionScrollProvider> 
                                <InvitesProvider>
                                  <AppLoader />    
                                </InvitesProvider>  
                              </GestionScrollProvider>
                            </TimelineProvider>
                          </ActionFABProvider>
                        </NavFABProvider>                  
                      </ModalProvider>
                    </RouteAbsProvider>   
                  </NotificationProvider>  
                </AuthProvider>
              </MembreProvider>
            </APIProvider>
          </MockModeProvider>
        </AccessTokenProvider>            
      </FontProvider>
    </PaletteProvider>
  );
}

function AppLoader() {
  const { fontsLoaded } = useFont();  

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { navTheme } = usePalette();
  const { state } = useAuth()  

  /* const enregistrerPushToken = async (accessToken: string)=>{
    
    if(!Device.isDevice){
      alert('notifications push requièrent un appareil physique')
      return
    }

    const {status: statusExistant} = await Notifs.getPermissionsAsync()
    let statusFinal = statusExistant

    if(statusExistant !== 'granted'){
      const {status} = await Notifs.requestPermissionsAsync()
      statusFinal = status
    }

    if(statusFinal !== 'granted'){
      alert('permission aux notifications push non-accordée')
      return
    }

    const pushToken = (await Notifs.getExpoPushTokenAsync()).data
    //log('pushToken', pushToken)

    try {
      await api.post('/notifications/push_token', 
        {
          push_token: pushToken
        },
        {
          headers:{
            'Authorization':`Bearer ${accessToken}`
          }
        }
      )
      return true
    } catch (error) {
      catcher(error, 'problème survenu lors de l\'ouverture')
      return false
    }
  } */

  useEffect(() => { 
    log('RootLayoutNav render, state actuel:', state);
    if (state === 'unauthenticated') {
      SplashScreen.hideAsync();
      router.replace('/(auth)/login'); // 👈 écrase toute route restaurée périmée
    } else if (state === 'authenticated') {
      SplashScreen.hideAsync();
      router.replace('/(tabs)/home'); // 👈 idem
    }
    //router.replace('/(tabs)/home')
  }, [state]);

  if (state === 'loading') {
    return <ChargementEcran/>;
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Protected guard={state === 'authenticated'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />          
        </Stack.Protected>
        <Stack.Protected guard={state === 'unauthenticated'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>  
        <Stack.Screen
          name="(modals)"
          options={{
            presentation: 'transparentModal',
            animation: 'none',                
            gestureEnabled: false,            
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='scanQR'
          options={{
            headerShown:false
          }}
        />
      </Stack>      
      <Toast config={toastConfig}/>
    </ThemeProvider>
  );
}
