import { useEffect, useState } from 'react';
import '../i18n';

//Providers
import { APIProvider } from '@/contextes/contexteAPI';
import { FontProvider, useFont } from '@/contextes/contexteFont';
import { MembreProvider } from '@/contextes/contexteMembre';
import { ModalProvider } from '@/contextes/contexteModals';
import { PaletteProvider, usePalette } from '@/contextes/contextePalette';
import { RouteAbsProvider } from '@/contextes/contexteRoute';
import { AccessTokenProvider } from '@/contextes/contexteToken';
import { ThemeProvider } from "expo-router/react-navigation";
import { FabProvider } from '@/contextes/contexteFAB';

//Contexts

//Dependencies
import { router, Stack, usePathname } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

//Components
import Toast from 'react-native-toast-message';

//Functions
import ChargementEcran from '@/components/chargementEcran';
import { AuthProvider, useAuth } from '@/contextes/contexteAuth';
import { GestionScrollProvider } from '@/contextes/contexteGestionListes';
import { InvitesProvider } from '@/contextes/contexteInvites';
import { ConversationsProvider } from '@/contextes/contexteConversations';
import { MockModeProvider } from '@/contextes/contexteMockMode';
import { NotificationProvider } from '@/contextes/contexteNotifications';
import { SettingsProvider, useSettings } from '@/contextes/contexteSettings';
import { TimelineProvider } from '@/contextes/contexteTimeline';
import {
    configureReanimatedLogger,
    ReanimatedLogLevel,
} from 'react-native-reanimated';

import { toastConfig } from '@/constants/toastConfig';
import { EventDraftProvider } from '@/contextes/contexteEventDraft';
import { SignalementsProvider } from '@/contextes/contexteSignalements';
import { initLocalization } from '@/locales/initLocale';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FontProvider>
        <AccessTokenProvider>
          <MockModeProvider>
            <APIProvider>
              <SignalementsProvider>
              
                <SettingsProvider>
                  <PaletteProvider>
                    <MembreProvider>
                      <AuthProvider> 
                        <NotificationProvider>
                          <ConversationsProvider>
                            <RouteAbsProvider>
                              <ModalProvider>                  
                                <FabProvider>
                                  <TimelineProvider>
                                    <GestionScrollProvider> 
                                      <InvitesProvider>
                                        
                                          <AppLoader />  
                                    
                                      </InvitesProvider>  
                                    </GestionScrollProvider>
                                  </TimelineProvider>
                                </FabProvider>                  
                              </ModalProvider>
                            </RouteAbsProvider>
                          </ConversationsProvider>   
                        </NotificationProvider>  
                      </AuthProvider>
                    </MembreProvider>
                  </PaletteProvider>
                </SettingsProvider>
              </SignalementsProvider>
            </APIProvider>
          </MockModeProvider>
        </AccessTokenProvider>            
      </FontProvider>
    </GestureHandlerRootView>
    
  );
}

function AppLoader() {
  const { fontsLoaded } = useFont();
  const { settings, hydrated: settingsLoaded } = useSettings();
  const [localeLoaded, setLocaleLoaded] = useState(false);

  useEffect(() => {
    if (!settingsLoaded) return;
    initLocalization(settings.language).finally(() => setLocaleLoaded(true));
  }, [settingsLoaded]);

  useEffect(() => {
    if (fontsLoaded && localeLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, localeLoaded]);

  if (!fontsLoaded || !settingsLoaded || !localeLoaded) return null;

  return (
    <EventDraftProvider makeReq={false}>
      <RootLayoutNav />
    </EventDraftProvider>
  );
}

function RootLayoutNav() {
  const { navTheme } = usePalette();
  const { state } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (state !== 'authenticated') return

    let actif = true
    let dernierDeclenchement = 0
    let subscription: ReturnType<typeof Accelerometer.addListener> | undefined

    const demarrerEcoute = async () => {
      try {
        const disponible = await Accelerometer.isAvailableAsync()
        if (!actif || !disponible) return

        Accelerometer.setUpdateInterval(100)
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const acceleration = Math.sqrt(x * x + y * y + z * z)
          const maintenant = Date.now()
          const dejaDansSignalement = pathname.endsWith('/reportBug')

          if (acceleration < 2.3 || dejaDansSignalement || maintenant - dernierDeclenchement < 2000) return

          dernierDeclenchement = maintenant
          router.push('/(modals)/reportBug')
        })
      } catch (error) {
        console.warn('Impossible de démarrer la détection de secousse', error)
      }
    }

    void demarrerEcoute()
    return () => {
      actif = false
      subscription?.remove()
    }
  }, [pathname, state])

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

  if (state === 'loading') {
    return <ChargementEcran />;
  }

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        {/* Modals and scanQR are only ever opened by a signed-in member, so they live
            behind the same guard as the tabs: signing out removes them all at once and
            shows (auth). Outside the guard, an open modal (e.g. the sign-out confirmation)
            stayed on top of the login screen. */}
        <Stack.Protected guard={state === 'authenticated'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        </Stack.Protected>
        <Stack.Protected guard={state === 'unauthenticated'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <Toast config={toastConfig}/>
    </ThemeProvider>
  );
}
