import { Camera, CameraView, } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused, useNavigation, } from "expo-router/react-navigation";
import axios from 'axios';
import Toast from 'react-native-toast-message';

import ToastAbs from '@/abstractions/toastAbs';
import Haptics from '@/abstractions/haptics';

import { useModal } from '@/contextes/contexteModals';
import { useRouteAbs } from '@/contextes/contexteRoute';
import { usePalette } from '@/contextes/contextePalette';
import { useAccessToken } from '@/contextes/contexteToken';
import { useFont } from '@/contextes/contexteFont';

import catcher from '@/functions/catcher';
import log from '@/functions/log';
import { router } from 'expo-router';
import {toastConfig, toastTypes} from '@/constants/toastConfig';

interface QRCodeData {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  url: string;
  body?: Record<string, unknown>;
}

interface BarcodeScanResult {
  data: string;
  type?: string;
}

export default function ScannerQRCode(): React.ReactElement {
    const { colors } = usePalette();
    const { fonts } = useFont();
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const [hasPermission, setHasPermission] = useState<boolean | null>(false);
    const { getToken } = useAccessToken();
    const { ajouterEcran } = useRouteAbs();

    const colorsScheme = useColorScheme();

    const icones = {
        croix: colorsScheme === 'dark'
        ? require('../assets/icones/croix-dark-icon.png')
        : require('../assets/icones/croix-light-icon.png'),
        scanne: require('../assets/icones/scanne-icon.png'),
    };

    const cScan = useRef<boolean>(false);
    const timeoutScan = useRef<number>(null);
    const intervalPermission = useRef<number>(null);
    const secondesRef = useRef<number>(0);

    const [secondes, setSecondes] = useState<number>(0);
    const [scanne, setScanne] = useState<boolean>(false);
    const [scanHint, setScanHint] = useState<boolean>(false);

    const dimensionCadre = useSharedValue<number>(230);
    const opaciteCadre = useSharedValue<number>(1);
    const opaciteConfirmation = useSharedValue<number>(0);

    const cadreAnime = useAnimatedStyle(() => {
        return {
        height: dimensionCadre.value,
        width: dimensionCadre.value,
        opacity: opaciteCadre.value,
        };
    });

    const confirmationAnime = useAnimatedStyle(() => {
        return {
        opacity: opaciteConfirmation.value,
        };
    });

    const getCameraPermission = async (): Promise<void> => {
        const { status } = await Camera.getCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'demande de permission d\'accès à la caméra',
                'sync a besoin d\'accéder à la caméra pour scanner le code qr; acceptes-tu?',
                [
                    {
                        text: 'oui',
                        onPress: async () => {
                        const { granted, canAskAgain } = await Camera.requestCameraPermissionsAsync();
                        if (!canAskAgain && !granted)
                            Alert.alert(
                            'aller dans les règlages',
                            'il faut une intervention manuel; ne t\'inquiète pas, on n\'utilisera jamais ta caméra sans que tu le saches',
                            [
                                {
                                text: 'j\'y vais',
                                onPress: () => {
                                    Linking.openSettings();
                                },
                                },
                            ]
                            );
                        },
                    },
                    {
                        text: 'non',
                        style: 'cancel',
                    },
                ]
            );
        }
        setHasPermission(status === 'granted');
    };

  useFocusEffect(
    useCallback(() => {
        intervalPermission.current = setInterval(() => {
            setSecondes((prev) => prev + 1);
        }, 1000);

        if (!hasPermission) {
            getCameraPermission();
        }

        return () => {
            clearInterval(intervalPermission.current ?? 0);
            clearTimeout(timeoutScan.current ?? 0);
            setSecondes(0);
        }
    }, [ajouterEcran])
  );
    
    useEffect(() => {
        if (scanne) {
            dimensionCadre.value = withTiming(64, {
                duration: 700,
                easing: Easing.inOut(Easing.exp),
            });
            opaciteCadre.value = withTiming(0, {
                duration: 700,
                easing: Easing.in(Easing.poly(7)),
            });
            opaciteConfirmation.value = withTiming(0.7, {
                duration: 1000,
                easing: Easing.in(Easing.cubic),
            });
        } else {
            timeoutScan.current = setTimeout(() => {
                setScanHint(true);
            }, 20000);
            dimensionCadre.value = withRepeat(withTiming(256, { duration: 500 }), -1, true);
            opaciteConfirmation.value = withTiming(0, { duration: 500 });
            opaciteCadre.value = withTiming(1, { duration: 500 });
        }
    }, [scanne])

    useEffect(() => {        
        if (scanHint) {
            clearTimeout(timeoutScan.current ?? 0);
            clearInterval(intervalPermission.current ?? 0);
            ToastAbs.show({
                type: 'persoAvertissement',
                text1: 'problème à scanner?',
                text2: 'tu peux aussi entrer le code d\'ami inscrit en dessous du code qr',
                props: {
                text3: 'appuie ici pour entrer le code d\'ami',
                },
                autoHide: false,
                position: 'bottom',
                onPress: () => {
                router.push('/(modals)/ajouterAmi')
                },
            });
        }
    }, [scanHint])

  const handleBarCodeScanned = async (barcodeScanResult: BarcodeScanResult): Promise<void> => {
    try {
      const accessToken = await getToken();
      cScan.current = true;
      clearTimeout(timeoutScan.current ?? 0);
      setScanne(true);
      Haptics.succes();
      log('code qr scanne', barcodeScanResult.data);

      const { method, url, body } = JSON.parse(barcodeScanResult.data) as QRCodeData;

      const response = await axios({
        method,
        url,
        data: body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 5000,
      });

      log();
      if (response.status === 201) {
        ToastAbs.show({
          type: 'persoSucces',
          text1: 'demande d\'ami envoyée',
          text2: 'je sens que c\'est le début d\'un lien unique, presque magique!',
          autoHide: true,
        });

        const notifFeedback = response.data.notif_feedback

        if (!notifFeedback.notif_sent) {
          ToastAbs.show({
            type: toastTypes.warning,
            text1: 'notification non envoyée',
            text2: notifFeedback.message
          })
        }
      }
    } catch (error) {
      catcher(error, `la demande n'a pas passée`);
      setScanne(false);
      setTimeout(() => {
        cScan.current = false;
      }, 5000);
    }
  };

  if (!hasPermission)
    return (      
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            position: 'relative',
            alignSelf: 'center',
            fontFamily: fonts.body,
            color: colors.text,
          }}
        >
          Permission d'usage de la caméra non-accordée... Si tu as accepté, ça peut prendre du temps avant de se
          mettre à jour; il faut être patient: attente({secondes}s/20s)
        </Text>
      </View>
    );

  return (
    <>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <CameraView
        style={{ height: '100%', width: '100%' }}
        onBarcodeScanned={(data) => {
          if (!cScan.current) handleBarCodeScanned(data);
          else return;
        }}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      <View
        style={{
          position: 'absolute',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          backgroundColor: 'transparent',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            setScanne(false);
            cScan.current = false;
          }}
          style={{
            position: 'absolute',
            zIndex: 2,
            height: '100%',
            width: '100%',
          }}
        >
          <Animated.View
            style={[
              confirmationAnime,
              {
                height: '100%',
                width: '100%',
                backgroundColor: colors.success,
              },
            ]}
          />
        </TouchableOpacity>
        <Animated.Image
          source={icones.scanne}
          style={[cadreAnime]}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={{
            zIndex: 3,
            position: 'absolute',
            bottom: 64,
            right: 32,
            height: 64,
            width: 64,
            borderRadius: 100,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.error,
          }}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Image
            source={icones.croix}
            style={{
              transform: [{ rotate: '45deg' }],
              height: '56%',
              width: '56%',
            }}
          />
        </TouchableOpacity>
      </View>
      </View>
      <Toast config={toastConfig}/>
    </>
  );
}
