import { useAPI } from '@/contextes/contexteAPI';
import { useGestionScroll } from '@/contextes/contexteGestionListes';
import { usePalette } from '@/contextes/contextePalette';
import { useRouteAbs } from '@/contextes/contexteRoute';
import { useAccessToken } from '@/contextes/contexteToken';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModal } from '@/contextes/contexteModals'

import { useNavFab } from '@/hooks/useNavFAB';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Animated, { ReduceMotion, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue, withDecay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';

import { Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import catcher from '@/functions/catcher';
import { convertirLocalVersUTC, convertirUTCversLocale } from '@/functions/convertirUTCenLocal';
import formaterDatePourServeur from '@/functions/formaterDatePourServeur';
import log from '@/functions/log';
import {getCommonFreeSlots} from '@/functions/availability'


import EventsList from '@/components/eventsList';
import ProfilPic from '@/components/pfp';
import Timeline from '@/components/timeline';
import { useFont } from '@/contextes/contexteFont';
import { useMembre } from '@/contextes/contexteMembre';
import { useTimeline } from '@/contextes/contexteTimeline';


//dummy datas
//import {seedData} from '@/seed'
import { BlurView } from 'expo-blur';
import AutoRefresh from '@/functions/autoRefresh';
import { AxiosResponse } from 'axios';
import { Event, Friend } from '@/types/calendar';
import { withSpringConfig } from '@/constants/ReanimatedConfs';

//Constants
const WIDTH_COL = 80;
const HEIGHT_BOT_BAR = 80;
const HEIGHT_DATE = 56;
const HEIGHT_TIMELINE = 32;
const backToNowWidth = 56
const AnimatedStyleMinVal = 0.1
const LIST_HEIGHT = 104
const { width: WIN_W, height: WIN_H } = Dimensions.get('window') 

export default function Home() {
  const { colors } = usePalette()
  const { fonts } = useFont()
  const { getToken } = useAccessToken()
  const { ajouterEcran } = useRouteAbs() 
  const { api } = useAPI()
  const colorScheme = useColorScheme()
  const { initialiserOffset, afficherRetourMaintenant, onPan, offset: offsetX, LEFT_GO_TO_BEFORE, LEFT_GO_TO_AFTER } = useGestionScroll()
  const { pxHeures, pxHeuresShared, L_HEURES } = useTimeline();
  const insets = useSafeAreaInsets()
  const { membre } = useMembre()

  const MAX_OFFSET_X = (24.78 * (pxHeures + L_HEURES)) - WIN_W
  
  useNavFab({
    href: '/home/create',
    icon: null,
  })

  const icones = {
    arrowR:colorScheme === 'dark'?require('@/assets/icones/fleche-d-dark-icon.png'):require('@/assets/icones/fleche-d-light-icon.png'),
    arrowL:colorScheme === 'dark'?require('@/assets/icones/fleche-g-dark-icon.png'):require('@/assets/icones/fleche-g-light-icon.png'),
    loupe:colorScheme === 'dark'?require('@/assets/icones/loupe-dark-icon.png'):require('@/assets/icones/loupe-light-icon.png'),
    notifications:colorScheme === 'dark'?require('@/assets/icones/notif-dark-icon.png'):require('@/assets/icones/notif-light-icon.png'),
    maintenant:colorScheme === 'dark'?require('@/assets/icones/horloge-dark-icon.png'):require('@/assets/icones/horloge-light-icon.png'),
    deconnecte:colorScheme === 'dark'?require('@/assets/icones/dark-deconnecte-icon.png'):require('@/assets/icones/light-deconnecte-icon.png'),
    rafraichir: colorScheme === 'dark' ? require('@/assets/icones/rafraichir-dark-icon.png') : require('@/assets/icones/rafraichir-light-icon.png'),
    ajouterAmi:colorScheme === 'dark'?require('@/assets/icones/ajouter-ami-dark-icon.png'):require('@/assets/icones/ajouter-ami-dark-icon.png'),
  }
  
  //Refs
  const chargerEvenementsEvent = useRef(false)
  const offsetMaintenant = useRef(0)
  const friendsList = useAnimatedRef<Animated.ScrollView>()
  const friendsEventsRefresh = useRef<AutoRefresh>(null)
  const userEventsRefresh = useRef<AutoRefresh>(null)

  //Sates
  const [currentTime, setCurrentTime] = useState<DateTime>()
  const [friends, setFriends] = useState<Array<any>>([])
  const [userEvents, setUserEvents] = useState<Array<any>>([])
  const [todayDateTime, setTodayDateTime] = useState<DateTime>()
  const [chargementEchec, setChargementEchec] = useState(false)
  const [chargementEvenements, setChargementEvenements] = useState(false)
  const [afficherRetour, setAfficherRetour] = useState({afficher:afficherRetourMaintenant.value.afficher, left:afficherRetourMaintenant.value.left})

  //SharedValues
  const evAmisOffset = useSharedValue(0)
  const dateAujShared = useSharedValue<number>(0)
  const opaciteEcran = useSharedValue(0)
  const opaciteZoomableFlatlist = useSharedValue(1)
  const opaciteListeEv = useSharedValue(0)
  const opaciteRetour = useSharedValue(0);
  const chargementShared = useSharedValue(chargementEvenements)
  const offsetXBase = useSharedValue(0)
  const offsetYBase = useSharedValue(0)
  const offsetY = useSharedValue(0)
  
  //Animated Styles
  const loadingAnimated = useAnimatedStyle(() => ({
    opacity: chargementShared.value
      ? withRepeat(withTiming(AnimatedStyleMinVal, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true)
      : withTiming(1, { duration: 500 }),
  }));

  const retourMaintenantAnime = useAnimatedStyle(() => {
    "worklet"
    return {
      left: withSpring(
        afficherRetourMaintenant.value.left, 
        {mass:1.6, damping:20}),
      opacity: withTiming(
          afficherRetourMaintenant.value.afficher
          ? 1
          : 0, { duration: 500 })
    }
  })

  const modifierEvenementsMembreFetched = (data: any)=>{
    try {
      const events = data.evenements
      log("modifierEvenementsMembreFetched data.length", data)
      if (events) { 
        const dataLocale = events.map((evenement: any) => {
          if (!evenement.id_publique.includes('factice')) {
            const startLocalMs = convertirUTCversLocale(evenement.debut, membre.timezone)?.toMillis()
            const endLocalMs = convertirUTCversLocale(evenement.fin, membre.timezone)?.toMillis()

            return {
              ...evenement,
              id: evenement.id_publique,
              debut: startLocalMs,
              fin: endLocalMs,
              fuseauHoraire: membre.timezone
            }
          }
        })

        const evenementsTries = dataLocale.sort((a: any, b: any) => a.debut - b.fin)

        const evenementsFinal = evenementsTries.map((ev: any) => {
          if (ev) {
            const start = DateTime.fromMillis(ev.debut ?? 0)
            const end = DateTime.fromMillis(ev.fin ?? 0)

            return {
              ...ev,
              debut: start,
              fin: end
            }
          }
        })
        //log('evenements membre local', evenementsFinal)
        setUserEvents(evenementsFinal)
      }
    } catch (error) {
      catcher(error, 'erreur en formattant les évènements du membre')
    }
  }

  const modifierEvenementsAmisFetched = (data: any) => {
    const events = data.resultat ?? []
    //log("modifier evenements amis data: ", data)
    try {
      const amisFinal = events?.map((ami: Friend) => {
          //log('ami evenements', ami.evenements)
          const evenements = (ami.evenements || [])
                .map((ev: any) => {
                  const start = convertirUTCversLocale(ev.debut, membre.timezone) 
                  const end = convertirUTCversLocale(ev.fin, membre.timezone)
                  return {
                    id: ev.id,
                    url: ev.url,
                    ...(ev.prive ? {} : { title: ev.titre }),
                    debut: start?.toMillis(),
                    fin: end?.toMillis()
                  }
                })
            // Sort from earliest to latest
            .sort((a:any, b: any) => a.start - b.start)
            // Conversion from ms to DateTime (luxon)
            .map((ev: any) => (
              {
              ...ev,
              debut: DateTime.fromMillis(ev.debut),
              fin:   DateTime.fromMillis(ev.fin)
            }))
          //console.log("evenements de ", ami.id, evenements)
          return {
            ...ami,            
            evenements
          }
        })

      if(amisFinal.length > 0){
        setFriends(prev => {
            const map = new Map(prev.map(a => [a.id, a]));
            amisFinal.forEach((a: Friend) => map.set(a.id, a)); // remplace les doublons
            const amisSansDoublons = Array.from(map.values())
            //log("modifierEvenementsAmisFetched amisendal", amisendalSansDoublons[0].evenements)
            return amisSansDoublons;
          }
        );
      }
      else if (evAmisOffset.value > 0)
        evAmisOffset.value -= 1
    } catch (error) {
      setChargementEchec(true)
      catcher(error, 'erreur en formattant les evenements d\'amis')
    }
  }

  // ── Handlers ──
  const toggleBackToNow = (datetime: DateTime) => {
    const diffFromNow = DateTime.now().diff(datetime, 'minutes').minutes
    log('diff from now', diffFromNow)
    afficherRetourMaintenant.value = {
      left: diffFromNow > 0
        ? LEFT_GO_TO_AFTER        
        : LEFT_GO_TO_BEFORE,
      afficher: diffFromNow > 0 || diffFromNow < 0
    }
  }
  /**
   * Modifies current displayed date by going back in time
   */
  const reculerDate = () => {
    if (todayDateTime) {
      const newDt = todayDateTime.minus({ day: 1 });
      toggleBackToNow(newDt)
      setTodayDateTime(newDt);
      dateAujShared.value = newDt.toMillis();
      userEventsRefresh.current?.forceRefresh({ extraParams: { start: newDt.startOf('day'), end: newDt.endOf('day') } })
      friendsEventsRefresh.current?.forceRefresh({extraParams:{start:newDt.startOf('day'), end:newDt.endOf('day')}})
    }
  };

  /**
   * Modifies current displayed date by going forward in time
   */
  const avancerDate = () => {
    if (todayDateTime) {
      const newDt = todayDateTime.plus({ day: 1 });
      setTodayDateTime(newDt);
      dateAujShared.value = newDt.toMillis();
      toggleBackToNow(newDt)
      userEventsRefresh.current?.forceRefresh({ extraParams: { start: newDt.startOf('day'), end: newDt.endOf('day') } })
      friendsEventsRefresh.current?.forceRefresh({extraParams:{start:newDt.startOf('day'), end:newDt.endOf('day')}})
    }
  };

  const retourMaintenant = () => {
    const now = DateTime.now();
    initialiserOffset(now.hour * (pxHeures + L_HEURES));
    if (todayDateTime?.day !== now.day) {
      setTodayDateTime(now.startOf('day'));
      userEventsRefresh.current?.forceRefresh({ extraParams: { start: now.startOf('day'), end: now.endOf('day') } })
      friendsEventsRefresh.current?.forceRefresh({extraParams:{start:now.startOf('day'), end:now.endOf('day')}})
    }
    setAfficherRetour(prev => ({ ...prev, afficher: false }))
    afficherRetourMaintenant.value = {...afficherRetourMaintenant.value, afficher:false}
  };
  const lockedAxis = useSharedValue<string | null>(null)

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      lockedAxis.value = null
      offsetXBase.value = offsetX.value
      offsetYBase.value = offsetY.value
    })
    .onChange((e) => {
      // Lock la direction au premier mouvement significatif
      if (!lockedAxis.value) {
        if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
          lockedAxis.value = 'x'
        } else {
          lockedAxis.value = 'y'
        }
      }

      if (lockedAxis.value === 'x') {
        offsetX.value = Math.min(Math.max(offsetXBase.value - e.translationX, 0), MAX_OFFSET_X)
        scheduleOnRN(onPan, offsetX.value)
      } else {
        offsetY.value = Math.max(offsetYBase.value + e.translationY, 0)
      }
    })
    .onEnd((e) => {
      //scheduleOnRN(log, "offsetX", offsetX.value, "base", offsetXBase.value)
      //scheduleOnRN(log, "offsetY", offsetY.value, "base", offsetYBase.value)
      if (lockedAxis.value = 'x') {
        offsetXBase.value = offsetX.value
        offsetX.value = withDecay(
          {
            reduceMotion:ReduceMotion.Never,
            velocity: -e.velocityX,
            },
            (endished) => {
              if (endished) {
                //Snap to nearest hour
                const cellWidth = pxHeures + L_HEURES
                const nearest = Math.round(offsetX.value / cellWidth) * cellWidth
                offsetX.value = withSpring(nearest, withSpringConfig)            
                offsetXBase.value = nearest
              }
            }
        )
      }
      else {
        offsetYBase.value = offsetY.value      
        offsetY.value = withDecay(
        {
          velocity: -e.velocityY,
          },
          (endished) => {
            if (endished) {
              //Snap to nearest friend
              offsetYBase.value = offsetY.value
            }
          }
        )
      }
    });
  
  useAnimatedReaction(
      () => offsetY.value,
      (offset) => 
          scrollTo(friendsList, 0, offset, false)
  )

  useFocusEffect(
    useCallback(() => {
      const now = DateTime.now();
      setTodayDateTime(now.startOf('day'));
      setCurrentTime(now);
      dateAujShared.value = now.toMillis();
      //chargerEvenements(now, now)

      userEventsRefresh.current = new AutoRefresh(api, '/evenements/', {        
        extraParams: {
          start: formaterDatePourServeur(convertirLocalVersUTC(now.startOf('day'))),
          end: formaterDatePourServeur(convertirLocalVersUTC(now.endOf('day')))
        },
        onData: modifierEvenementsMembreFetched,
        onError: (error) => {
          log("impossible de charger les évènements du membre", error)
          catcher(error, "impossible de charger les évènements du membre")
        }
      })

      friendsEventsRefresh.current = new AutoRefresh(api, '/evenements/amis', {
        extraParams: {
          start: formaterDatePourServeur(convertirLocalVersUTC(now.startOf('day'))),
          end: formaterDatePourServeur(convertirLocalVersUTC(now.endOf('day')))
        },
        onData: modifierEvenementsAmisFetched,
        onError: (error) => {
          log("impossible de charger les évènements d'amis", error)
          catcher(error, "impossible de charger les évènements d'amis")
        }
      })      

      return () => {
        userEventsRefresh.current?.stop()
        friendsEventsRefresh.current?.stop()
      }
    }, [])
  );


  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    dateBar: {
      width: '100%',
      paddingHorizontal: 16,
      justifyContent: 'center',
      backgroundColor: colors.card,
      height: HEIGHT_DATE
    },
    dateText: {
      fontSize: 28,
      letterSpacing: 0.5,
      color: colors.text
    },
    timeline: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
      height: HEIGHT_TIMELINE,
      backgroundColor: colors.card,
      flexDirection:'row'
    },
    friendsZone: {
      flex: 4,                    // 3/4 de l'espace restant
      width: '100%',
      overflow: 'hidden',
    },
    memberZone: {
      flex: 1,                    // 1/4 de l'espace restant
      width: '100%',
      flexDirection: 'row',
      borderTopWidth: 1,
      alignItems:'center'
    },
    friendList: {
      flexDirection: 'row',
      height: 104,
    },
    column: {
      width: WIDTH_COL,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:colors.primary
    },
    profilPic: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    horizontalEvs: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    eventsBloc: {
      position: 'absolute',
      height: '80%',
      top: '10%',
      borderRadius: 6,
      padding: 4,
      minWidth: 32,
    },
    botBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.card,
      height: HEIGHT_BOT_BAR,
      borderColor:colors.border
    },
    arrow: {
      height: 32,
      width:'auto'
    },
    backToNow: {
      position: 'absolute',
      bottom: HEIGHT_BOT_BAR + 16,
      height: 34,
      width: 56,
      borderRadius: 100,
      borderWidth: 1,
      zIndex: 20,
      overflow: 'hidden',
    },
    backToNowInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarContainer: {
      flex:5
    },
    addFriendPlaceholderContainer: {
      height: '100%',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8
    },
    addFriendPlaceholderText: {
      color: colors.text,
      fontFamily: fonts.title,
      fontSize: 18
    }
  }
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={s.container}>

        {/* ── Timeline (heures) ── */}
        <View style={s.timeline}>
          <View style={ s.column} />
          <Timeline horizontal={true}/>
        </View>

        {/* ── Zone principale (3/4) — horaire amis ── */}
        <GestureDetector gesture={panGesture}>
          <View style={s.calendarContainer}>
          <Animated.View style={[loadingAnimated, s.friendsZone]}>
            {/* TODO: ScrollView verticale des amis */}
            {friends.length === 0 ? (
              <View style={s.addFriendPlaceholderContainer}>
                <Text style={s.addFriendPlaceholderText}>
                    ajoutes des amis ici:
                </Text>
                <TouchableOpacity onPress={()=>{
                    router.push('/(modals)/ajouterAmi')
                }}>
                    <Image
                        source={icones.ajouterAmi}
                        style={{height:64, width:64}}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
              </View>
              ) : (
                  <Animated.ScrollView
                    ref={friendsList}
                    showsVerticalScrollIndicator={false}
                  >
                    {friends.map((friend) => {
                      const commonFreeSlots = getCommonFreeSlots(
                        userEvents,
                        friend.evenements,
                        todayDateTime
                      )
                      return(
                        <View key={friend.id} style={[s.friendList]}>
                          {/* Photo de profil */}
                          <BlurView style={[s.column,{ backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
                            <ProfilPic
                              pfp={friend.fp_url}
                              size={64}
                            />
                          </BlurView>
                          {/* Événements horizontaux */}
                          <EventsList
                            owner={friend}
                            commonFreeSlots={commonFreeSlots}
                            listSize={LIST_HEIGHT}
                            horizontal={true}
                            events={friend.evenements}
                            textColor={colors.text}
                            offsetSnap={L_HEURES + pxHeures}
                            displayedDate={todayDateTime}
                            getEvenements={() => friendsEventsRefresh.current?.forceRefresh({extraParams:{start: todayDateTime?.startOf('day'), end:todayDateTime?.endOf('day')}})}
                          />
                        </View>                    
                      )})}
                </Animated.ScrollView>
            )}
          </Animated.View>        

        {/* ── Zone membre (1/4) ── */}
          <Animated.View style={[loadingAnimated, s.memberZone, { backgroundColor: colors.card }]}>
              <View style={[s.column, { backgroundColor: colors.card }]}>
                <ProfilPic
                  size={64}
                  pfp={membre.fp}
                />
              </View>    
              <EventsList
                owner={membre}
                commonFreeSlots={undefined}
                events={userEvents}
                offsetSnap={L_HEURES + pxHeures}
                eventsColor={colors.primary}
                textColor={colors.text}
                listSize={LIST_HEIGHT}
                displayedDate={todayDateTime}
                getEvenements={() => userEventsRefresh.current?.forceRefresh({extraParams:{start: todayDateTime?.startOf('day'), end:todayDateTime?.endOf('day')}})}
                horizontal={true}
              />
            </Animated.View>
        </View>
        </GestureDetector>

        {/* ── Barre du bas (flèches + date) ── */}
        <View style={[s.botBar]}>
           <TouchableOpacity style={s.arrow} onPress={reculerDate}>
            <Image
              source={icones.arrowL}
              style={{height:'100%'}}
              resizeMode='contain'
            />
          </TouchableOpacity>
          <View style={{padding:8, backgroundColor:colors.primary, borderWidth:1, borderColor:colors.border, borderRadius:8}}>
            <Text style={{ color: colors.text, fontFamily:fonts.title }}>
              {todayDateTime?.setLocale('fr').toFormat('d MMM')} 
            </Text>
          </View>
          <TouchableOpacity style={s.arrow} onPress={avancerDate}>
            <Image
              source={icones.arrowR}
              style={{height:'100%'}}
              resizeMode='contain'
            />
          </TouchableOpacity>
        </View>

        {/* ── Bouton retour maintenant (flottant) ── */}
        <Animated.View
          style={[
            retourMaintenantAnime,
            s.backToNow,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <TouchableOpacity onPress={retourMaintenant} style={s.backToNowInner}>
            <Text style={{ color: colors.text, fontSize: 12 }}>
              {currentTime?.day !== todayDateTime?.day
                ? currentTime?.toFormat('d MMM')
                : currentTime?.toFormat('HH:mm')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </GestureHandlerRootView>
  );
}
