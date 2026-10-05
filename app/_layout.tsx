import { useEffect, useState } from 'react';
import '../i18n';

//Providers
import { FabProvider as ActionFABProvider } from '@/contextes/contextActionFAB';
import { APIProvider } from '@/contextes/contexteAPI';
import { FontProvider, useFont } from '@/contextes/contexteFont';
import { MembreProvider } from '@/contextes/contexteMembre';
import { ModalProvider } from '@/contextes/contexteModals';
import { FabProvider as NavFABProvider } from '@/contextes/contexteNavFAB';
import { PaletteProvider, usePalette } from '@/contextes/contextePalette';
import { RouteAbsProvider } from '@/contextes/contexteRoute';
import { AccessTokenProvider } from '@/contextes/contexteToken';
import { ThemeProvider } from "expo-router/react-navigation";

//Contexts

//Dependencies
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

//Components
import Toast from 'react-native-toast-message';

//Functions
import ChargementEcran from '@/components/chargementEcran';
import { AuthProvider, useAuth } from '@/contextes/contexteAuth';
import { GestionScrollProvider } from '@/contextes/contexteGestionListes';
import { InvitesProvider } from '@/contextes/contexteInvites';
import { MockModeProvider } from '@/contextes/contexteMockMode';
import { NotificationProvider } from '@/contextes/contexteNotifications';
import { SettingsProvider, useSettings } from '@/contextes/contexteSettings';
import { TimelineProvider } from '@/contextes/contexteTimeline';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

import { toastConfig } from '@/constants/toastConfig';
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
    
      <FontProvider>
        <AccessTokenProvider>
          <MockModeProvider>
          <APIProvider>              
            <SettingsProvider>
              <PaletteProvider>
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
              </PaletteProvider>
            </SettingsProvider>          
            </APIProvider>
          </MockModeProvider>
        </AccessTokenProvider>            
      </FontProvider>
    
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

  if (state === 'loading') {
    return <ChargementEcran/>;
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
