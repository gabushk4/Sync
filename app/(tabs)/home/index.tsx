import { useAPI } from '@/contextes/contexteAPI';
import { useGestionScroll } from '@/contextes/contexteGestionListes';
import { usePalette } from '@/contextes/contextePalette';

import { useNavFab } from '@/hooks/useNavFAB';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { cancelAnimation, ReduceMotion, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue, withDecay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { DateTime } from 'luxon';

import { Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { getCommonFreeSlots } from '@/functions/availability';
import catcher from '@/functions/catcher';
import { convertLocalToUTC, convertUTCToLocal } from '@/functions/convertirUTCenLocal';
import formaterDatePourServeur from '@/functions/formaterDatePourServeur';
import log from '@/functions/log';


import CalendarMonthView from '@/components/calendarMonthView';
import EventsList, { RETRAIT_RANGEE } from '@/components/eventsList';
import ProfilPic from '@/components/pfp';
import Timeline from '@/components/timeline';
import { useFont } from '@/contextes/contexteFont';
import { useMembre } from '@/contextes/contexteMembre';
import { useTimeline } from '@/contextes/contexteTimeline';


//dummy datas
//import {seedData} from '@/seed'
import { withSpringConfig } from '@/constants/ReanimatedConfs';
import AutoRefresh from '@/functions/autoRefresh';
import { Friend } from '@/types/calendar';

//Constants
const WIDTH_COL = 80;
const HEIGHT_BOT_BAR = 80;
const HEIGHT_DATE = 56;
const HEIGHT_TIMELINE = 32;
const AnimatedStyleMinVal = 0.1
const LIST_HEIGHT = 104
// Height of the floating back-to-now button.
const HAUTEUR_RETOUR = 34
const { width: WIN_W, height: WIN_H } = Dimensions.get('window')
// Max events per request in the month view (the API defaults to 20, too few for a month).
const LIMITE_MOIS = 300

/** Formats the displayed local day as the UTC date range expected by the events API. */
function getEventDateRangeParams(date: DateTime) {
  return {
    debut: formaterDatePourServeur(convertLocalToUTC(date.startOf('day'))),
    fin: formaterDatePourServeur(convertLocalToUTC(date.endOf('day'))),
  }
}

/**
 * Query params for GET /evenements and /evenements/amis covering [debut, fin].
 * The API reads `debut`/`fin` as UTC SQL datetimes; the app used to send
 * `start`/`end` (sometimes as raw DateTime objects), which the API ignored —
 * it always answered with today's events, whatever day or month was shown.
 * Part of user story 9 (accepted invitations must show up on the right day).
 * SUBJECT TO CHANGE: may be revised depending on how teammates implement their own user stories.
 *
 * @param {DateTime} debut - Local start of the range.
 * @param {DateTime} fin - Local end of the range.
 * @param {number} [limite] - Max number of events (non-recurring) to return.
 * @returns {{ debut: string | null, fin: string | null, limite?: number }}
 */
const paramsPlage = (debut: DateTime, fin: DateTime, limite?: number) => ({
  debut: formaterDatePourServeur(convertLocalToUTC(debut)),
  fin: formaterDatePourServeur(convertLocalToUTC(fin)),
  ...(limite ? { limite } : {}),
})

/**
 * Query params for one local day (timeline view). See {@link paramsPlage}.
 * Part of user story 9. SUBJECT TO CHANGE: may be revised depending on how
 * teammates implement their own user stories.
 *
 * @param {DateTime} jour - Any moment of the day to fetch.
 * @returns {{ debut: string | null, fin: string | null }}
 */
const paramsJour = (jour: DateTime) => paramsPlage(jour.startOf('day'), jour.endOf('day'))

/**
 * Query params for one local month (calendar view's day dots), with a higher
 * event limit. See {@link paramsPlage}.
 * Part of user stories 5 and 9. SUBJECT TO CHANGE: may be revised depending on
 * how teammates implement their own user stories.
 *
 * @param {DateTime} mois - Any moment of the month to fetch.
 * @returns {{ debut: string | null, fin: string | null, limite: number }}
 */
const paramsMois = (mois: DateTime) => paramsPlage(mois.startOf('month'), mois.endOf('month'), LIMITE_MOIS)

/**
 * Home screen. Shows the displayed day as horizontal timeline rows: one per
 * friend (their events + free slots shared with the member), and the member's
 * own row at the bottom. Can switch to a month calendar (user story 5). Both
 * views poll the API (AutoRefresh) for the displayed day or month, so an
 * accepted invitation shows up on both members' rows (user story 9).
 *
 * @returns {JSX.Element}
 */
export default function Home() {
  const { t } = useTranslation('home')
  const { colors } = usePalette()
  const { fonts } = useFont()
  const { api } = useAPI()
  const colorScheme = useColorScheme()
  const { initialiserOffset, afficherRetourMaintenant, onPan, offset: offsetX, LEFT_GO_TO_BEFORE, LEFT_GO_TO_AFTER, clampOffset, maxOffset } = useGestionScroll()
  const { pxHeures, pxHeuresShared, L_HEURES } = useTimeline();
  const { membre } = useMembre()

  const icones = {
    arrowR:colorScheme === 'dark'?require('@/assets/icones/fleche-d-dark-icon.png'):require('@/assets/icones/fleche-d-light-icon.png'),
    arrowL:colorScheme === 'dark'?require('@/assets/icones/fleche-g-dark-icon.png'):require('@/assets/icones/fleche-g-light-icon.png'),
    loupe:colorScheme === 'dark'?require('@/assets/icones/loupe-dark-icon.png'):require('@/assets/icones/loupe-light-icon.png'),
    notifications:colorScheme === 'dark'?require('@/assets/icones/notif-dark-icon.png'):require('@/assets/icones/notif-light-icon.png'),
    maintenant:colorScheme === 'dark'?require('@/assets/icones/horloge-dark-icon.png'):require('@/assets/icones/horloge-light-icon.png'),
    deconnecte:colorScheme === 'dark'?require('@/assets/icones/dark-deconnecte-icon.png'):require('@/assets/icones/light-deconnecte-icon.png'),
    rafraichir: colorScheme === 'dark' ? require('@/assets/icones/rafraichir-dark-icon.png') : require('@/assets/icones/rafraichir-light-icon.png'),
    ajouterAmi:colorScheme === 'dark'?require('@/assets/icones/ajouter-ami-dark-icon.png'):require('@/assets/icones/ajouter-ami-dark-icon.png'),
    calendrier: colorScheme === 'dark' ? require('@/assets/icones/calendrier-dark-icon.png') : require('@/assets/icones/calendrier-light-icon.png'),
  }
  
  //Refs
  const chargerEvenementsEvent = useRef(false)
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
  // Vertical center of the member's row (where their photo sits), measured from
  // the layout: the back-to-now button is centered on that line.
  const yZoneCalendrier = useRef(0)
  const rangeeMembre = useRef<{ y: number, height: number } | null>(null)
  const [centreRangeeMembre, setCentreRangeeMembre] = useState<number>()
  /**
   * Recomputes the member row's center once both layouts are known.
   *
   * @returns {void}
   */
  const majCentreRangeeMembre = () => {
    if (!rangeeMembre.current) return
    setCentreRangeeMembre(yZoneCalendrier.current + rangeeMembre.current.y + rangeeMembre.current.height / 2)
  }
  const [afficherRetour, setAfficherRetour] = useState({afficher:afficherRetourMaintenant.value.afficher, left:afficherRetourMaintenant.value.left})
  // User story 5: whether the month calendar replaces the timeline, and which month it shows.
  const [vueCalendrier, setVueCalendrier] = useState(false)
  const [moisCalendrier, setMoisCalendrier] = useState<DateTime>()

  // Pre-fills the create screen with the day currently displayed, at the
  // next full hour of the current time (create.tsx still bumps it to at
  // least 1h from now when needed).
  const maintenantFab = DateTime.now()
  const debutCreation = todayDateTime
    ?.startOf('day')
    .plus({ hours: maintenantFab.hour + 1 })

  useNavFab("home", {
    href: '/home/create',
    params: debutCreation ? { start: debutCreation.toISO() } : undefined,
    icon: null,
    visible: !vueCalendrier, // user story 5: would otherwise catch taps meant for the calendar
  })

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

  // Back-to-now button: its side tells where now is (right side = now is later,
  // left side = now is earlier), so it shows the matching arrow.
  const flecheDroiteAnime = useAnimatedStyle(() => ({
    opacity: afficherRetourMaintenant.value.left === LEFT_GO_TO_AFTER ? 1 : 0,
  }))
  const flecheGaucheAnime = useAnimatedStyle(() => ({
    opacity: afficherRetourMaintenant.value.left === LEFT_GO_TO_AFTER ? 0 : 1,
  }))

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

  /**
   * AutoRefresh callback for GET /evenements: converts the member's events to
   * local DateTimes, sorts them earliest first and stores them for the member's
   * row and the calendar's day dots.
   * Updated for user story 9. SUBJECT TO CHANGE: may be revised depending on how
   * teammates implement their own user stories.
   *
   * @param {{ evenements?: Array<Object> }} data - API response body.
   * @returns {void}
   */
  const modifierEvenementsMembreFetched = (data: any)=>{
    try {
      const events = data.evenements
      log("modifierEvenementsMembreFetched data.length", data)
      if (events) {
        // User story 9: placeholders ('factice') are dropped here instead of becoming
        // `undefined` entries, which crashed the sort below and the list rendering.
        const dataLocale = events
          .filter((evenement: any) => evenement && !evenement.id_publique?.includes('factice'))
          .map((evenement: any) => {
            const startLocalMs = convertUTCToLocal(evenement.debut, membre.timezone)?.toMillis()
            const endLocalMs = convertUTCToLocal(evenement.fin, membre.timezone)?.toMillis()

            return {
              ...evenement,
              id: evenement.id_publique,
              debut: startLocalMs,
              fin: endLocalMs,
              fuseauHoraire: membre.timezone
            }
          })

        // Earliest first (was `a.debut - b.fin`, which doesn't sort anything consistently).
        const evenementsTries = dataLocale.sort((a: any, b: any) => (a.debut ?? 0) - (b.debut ?? 0))

        const evenementsFinal = evenementsTries.map((ev: any) => {
          const start = DateTime.fromMillis(ev.debut ?? 0)
          const end = DateTime.fromMillis(ev.fin ?? 0)

          return {
            ...ev,
            debut: start,
            fin: end
          }
        })
        //log('evenements membre local', evenementsFinal)
        setUserEvents(evenementsFinal)
      }
    } catch (error) {
      catcher(error, t('errors.formatMemberEvents'))
    }
  }

  /**
   * AutoRefresh callback for GET /evenements/amis: converts each friend's events
   * to local DateTimes (title hidden for private events), sorts them, and merges
   * the friends into the list shown as rows (replacing a friend already there).
   * Updated for user story 9. SUBJECT TO CHANGE: may be revised depending on how
   * teammates implement their own user stories.
   *
   * @param {{ resultat?: Friend[] }} data - API response body.
   * @returns {void}
   */
  const modifierEvenementsAmisFetched = (data: any) => {
    const events = data.resultat ?? []
    log("modifier evenements amis data: ", data)
    try {
      const amisFinal = events?.map((ami: Friend) => {
          //log('ami evenements', ami.evenements)
          // User story 9: the API now sends formatted events (public id, titre hidden
          // when private). This used `ev.id` (the private numeric id, so details
          // couldn't open), stored the title as `title` while ListItem reads `titre`
          // (friends' events showed no title), and sorted on a missing `start` field.
          const evenements = (ami.evenements || [])
                .map((ev: any) => {
                  const start = convertUTCToLocal(ev.debut, membre.timezone)
                  const end = convertUTCToLocal(ev.fin, membre.timezone)
                  return {
                    id: ev.id_publique,
                    url: ev.url,
                    type: ev.type,
                    titre: ev.prive ? undefined : ev.titre,
                    prive: ev.prive,
                    debut: start?.toMillis(),
                    fin: end?.toMillis()
                  }
                })
            // Sort from earliest to latest
            .sort((a:any, b: any) => (a.debut ?? 0) - (b.debut ?? 0))
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
      catcher(error, t('errors.formatFriendEvents'))
    }
  }

  // ── Handlers ──
  /**
   * Shows the floating "back to now" button when `datetime` isn't now, on the
   * side pointing toward now.
   *
   * @param {DateTime} datetime - The day/time now displayed.
   * @returns {void}
   */
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
   * Reloads the member's and friends' events for the given day. setParams cancels
   * the request still in flight for the previous day. Sends `debut`/`fin`
   * (paramsJour), the names the events API reads.
   *
   * @param {DateTime} dt - Any moment of the day to load.
   * @returns {void}
   */
  const refreshAt = (dt: DateTime) => {
    const extraParams = paramsJour(dt);
    userEventsRefresh.current?.setParams(extraParams);
    friendsEventsRefresh.current?.setParams(extraParams);
  };

  const changerJour = (delta: number) => {
    if (!todayDateTime) return;
    const newDt = todayDateTime.plus({ days: delta });
    setTodayDateTime(newDt);
    dateAujShared.value = newDt.toMillis();
    toggleBackToNow(newDt);
    refreshAt(newDt);
  };

  const reculerDate = () => changerJour(-1);
  const avancerDate = () => changerJour(1);

  /**
   * Toggles between the timeline view (day) and the calendar view (month).
   * Switching in refetches the member's events for the whole month (to populate the
   * day dots); switching out refetches just the currently displayed day.
   * Part of user story 5 (conventional month calendar view).
   *
   * @returns {void}
   */
  const toggleVueCalendrier = () => {
    const activation = !vueCalendrier
    setVueCalendrier(activation)

    if (activation && todayDateTime) {
      const mois = todayDateTime.startOf('month')
      setMoisCalendrier(mois)
      userEventsRefresh.current?.forceRefresh({ extraParams: paramsMois(mois) })
    } else if (todayDateTime) {
      userEventsRefresh.current?.forceRefresh({ extraParams: paramsJour(todayDateTime) })
      friendsEventsRefresh.current?.forceRefresh({ extraParams: paramsJour(todayDateTime) })
    }
  }

  /**
   * Changes the displayed month in the calendar view and refetches the member's
   * events for that new month.
   * Part of user story 5 (conventional month calendar view).
   *
   * @param {1 | -1} direction - 1 to go to the next month, -1 for the previous month.
   * @returns {void}
   */
  const changerMoisCalendrier = (direction: 1 | -1) => {
    if (!moisCalendrier) return
    const nouveauMois = moisCalendrier.plus({ month: direction })
    setMoisCalendrier(nouveauMois)
    userEventsRefresh.current?.forceRefresh({ extraParams: paramsMois(nouveauMois) })
  }

  /**
   * Selects a day in the calendar view and switches back to the timeline view on that day,
   * refetching both the member's and friends' events for that day.
   * Part of user story 5 (conventional month calendar view).
   *
   * @param {DateTime} jour - The day that was tapped in the calendar grid.
   * @returns {void}
   */
  const selectionnerJourCalendrier = (jour: DateTime) => {
    toggleBackToNow(jour)
    setTodayDateTime(jour)
    dateAujShared.value = jour.toMillis()
    setVueCalendrier(false)
    userEventsRefresh.current?.forceRefresh({ extraParams: paramsJour(jour) })
    friendsEventsRefresh.current?.forceRefresh({ extraParams: paramsJour(jour) })
  }

  /**
   * Called once the user finishes a long-press-and-drag range selection in
   * the calendar view. Closes the calendar and opens the create-event screen,
   * pre-filled to span the whole selected range (start of the first day to
   * the end of the last day).
   * Part of user story 5 (conventional month calendar view).
   *
   * @param {DateTime} debut - First selected day.
   * @param {DateTime} fin - Last selected day.
   * @returns {void}
   */
  const selectionnerPlageCalendrier = (debut: DateTime, fin: DateTime) => {
    setVueCalendrier(false)
    router.push({
      pathname: '/home/create',
      params: {
        start: debut.startOf('day').toISO(),
        end: fin.endOf('day').toISO(),
      },
    })
  }

  /**
   * "Back to now" button: scrolls the timeline to the current hour and, if
   * another day was displayed, switches back to today and refetches its events.
   *
   * @returns {void}
   */
  const retourMaintenant = () => {
    const now = DateTime.now();
    initialiserOffset(now.hour * (pxHeures + L_HEURES));
    if (todayDateTime?.day !== now.day) {
      setTodayDateTime(now.startOf('day'));
      refreshAt(now)
    }
    setAfficherRetour(prev => ({ ...prev, afficher: false }))
    afficherRetourMaintenant.value = {...afficherRetourMaintenant.value, afficher:false}
  };
  const lockedAxis = useSharedValue<string | null>(null)

  const maxY = useSharedValue(0)
  const zoneH = useRef(0)
  const majMaxY = () => {
    maxY.value = Math.max(0, friends.length * (LIST_HEIGHT + 4) - zoneH.current)
  }
  useEffect(majMaxY, [friends.length])

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(offsetX)            // stoppe l'inertie en cours
      lockedAxis.value = null
      offsetXBase.value = offsetX.value
      offsetYBase.value = offsetY.value
    })
    .onChange((e) => {
      // Lock la direction au premier mouvement significatif
      if (!lockedAxis.value && (Math.abs(e.translationX) > 8 || Math.abs(e.translationY) > 8)) {
        lockedAxis.value = Math.abs(e.translationX) > Math.abs(e.translationY) ? 'x' : 'y'
      }
      if (lockedAxis.value === 'x') {
        offsetX.value = clampOffset(offsetXBase.value - e.translationX)
      }else if(lockedAxis.value === 'y') {
        offsetY.value = clampOffset(offsetYBase.value - e.translationY)
      }
    })
    .onEnd((e) => {
      //scheduleOnRN(log, "offsetX", offsetX.value, "base", offsetXBase.value)
      //scheduleOnRN(log, "offsetY", offsetY.value, "base", offsetYBase.value)
      if (lockedAxis.value === 'x') {
        offsetX.value = withDecay(
        { velocity: -e.velocityX, clamp: [0, maxOffset] },   // la ligne clé
        (finished) => {
          'worklet'
          if (!finished) return
          const cell = pxHeures + L_HEURES
          const snapped = clampOffset(Math.round(offsetX.value / cell) * cell)
          offsetX.value = withSpring(snapped, withSpringConfig)
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
              offsetY.value = withDecay({ velocity: -e.velocityY, clamp: [0, maxY.value] })
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

  useAnimatedReaction(
    () => offsetX.value,
    (current, previous) => {
      onPan(current)
    }
  )

  useFocusEffect(
    useCallback(() => {
      const now = DateTime.now();
      setTodayDateTime(now.startOf('day'));
      setCurrentTime(now);
      dateAujShared.value = now.toMillis();
      //chargerEvenements(now, now)

      userEventsRefresh.current = new AutoRefresh(api, '/evenements/', {
        extraParams: paramsJour(now),
        onData: modifierEvenementsMembreFetched,
        onError: (error) => {
          log("impossible de charger les évènements du membre", error)
          catcher(error, t('errors.loadMemberEvents'))
        }
      })

      friendsEventsRefresh.current = new AutoRefresh(api, '/evenements/amis', {
        extraParams: paramsJour(now),
        onData: modifierEvenementsAmisFetched,
        onError: (error) => {
          log("impossible de charger les évènements d'amis", error)
          catcher(error, t('errors.loadFriendEvents'))
        }
      })      

      return () => {
        userEventsRefresh.current?.destroy()
        friendsEventsRefresh.current?.destroy()
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
      marginBottom: 4
    },
    // Friend's photo column: as tall as the row, inset like its blocks.
    colonneAmi: {
      width: WIDTH_COL,
      height: '100%',
      paddingVertical: RETRAIT_RANGEE,
    },
    // Transparent: blends with the timeline behind it (the screen's background).
    photoAmi: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      overflow: 'hidden',
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
    // Date pill in the bottom bar: calendar icon + displayed date, opens the month view (user story 5).
    boutonDate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 44,
      paddingHorizontal: 16,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
    },
    iconeDate: {
      height: 22,
      width: 22,
    },
    texteDate: {
      color: colors.text,
      fontFamily: fonts.title,
      fontSize: 16,
    },
    backToNow: {
      position: 'absolute',
      bottom: HEIGHT_BOT_BAR + 16,
      height: HAUTEUR_RETOUR,
      width: 56,
      borderRadius: 100,
      borderWidth: 1,
      zIndex: 20,
      overflow: 'hidden',
    },
    // Both arrows are stacked in layers filling the button (so each one is centered);
    // only the one pointing to now is visible.
    calqueFleche: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flecheRetour: {
      height: 16,
      width: 16,
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
        {!vueCalendrier && (
          <View style={s.timeline}>
            <View style={ s.column} />
            <Timeline horizontal={true}/>
          </View>
        )}

        {/* ── Calendar view (month grid) — user story 5 ── */}
        {vueCalendrier ? (
          <CalendarMonthView
            monthDate={moisCalendrier ?? todayDateTime ?? DateTime.now()}
            selectedDate={todayDateTime}
            events={userEvents}
            onSelectDay={selectionnerJourCalendrier}
            onChangeMonth={changerMoisCalendrier}
            onDismiss={toggleVueCalendrier}
            onSelectRange={selectionnerPlageCalendrier}
          />
        ) : (
        /* ── Zone principale (3/4) — horaire amis ── */
        <GestureDetector gesture={panGesture}>
          <View
            style={s.calendarContainer}
            onLayout={(e) => {
              yZoneCalendrier.current = e.nativeEvent.layout.y
              majCentreRangeeMembre()
            }}
          >
          <Animated.View style={[loadingAnimated, s.friendsZone]}>
            {/* TODO: ScrollView verticale des amis */}
            {friends.length === 0 ? (
              <View style={s.addFriendPlaceholderContainer}>
                <Text style={s.addFriendPlaceholderText}>
                  {t('friendsListEmptyState')}
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
                    onLayout={(e) => {
                      zoneH.current = e.nativeEvent.layout.height;
                      majMaxY();
                    }}
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
                          {/* Same band as the row's events/free slots (RETRAIT_RANGEE above and
                              below, rounded like the blocks) so the photo lines up with them. */}
                          <TouchableOpacity
                            style={s.colonneAmi}
                            accessibilityRole="button"
                            accessibilityLabel={t('viewFriendProfile', { name: friend.pseudo })}
                            onPress={() => router.push({ pathname: '/(tabs)/profile/[membreId]', params: { membreId: friend.id } })}
                          >
                          <View style={s.photoAmi}>
                            <ProfilPic
                              pfp={friend.fp_url}
                              size={64}
                            />
                          </View>
                          </TouchableOpacity>
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
                            getEvenements={() => { refreshAt(todayDateTime ?? DateTime.now()) }}
                          />
                        </View>                    
                      )})}
                </Animated.ScrollView>
            )}
          </Animated.View>        

        {/* ── Zone membre (1/4) ── */}
          <Animated.View
            style={[loadingAnimated, s.memberZone, { backgroundColor: colors.card }]}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout
              rangeeMembre.current = { y, height }
              majCentreRangeeMembre()
            }}
          >
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
                getEvenements={() => {refreshAt(todayDateTime ?? DateTime.now())}}
                horizontal={true}
              />
            </Animated.View>
        </View>
        </GestureDetector>
        )}

        {/* ── Bottom bar (arrows + date + calendar toggle) — hidden in calendar view, closed via onDismiss instead ── */}
        {!vueCalendrier && (
        <View style={[s.botBar]}>
              <TouchableOpacity style={s.arrow} onPress={reculerDate}>
                <Image
                  source={icones.arrowL}
                  style={{height:'100%'}}
                  resizeMode='contain'
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.boutonDate} onPress={toggleVueCalendrier}>
                <Image
                  source={icones.calendrier}
                  style={s.iconeDate}
                  resizeMode='contain'
                />
                <Text style={s.texteDate}>
                  {todayDateTime?.toFormat('d MMM')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.arrow} onPress={avancerDate}>
                <Image
                  source={icones.arrowR}
                  style={{height:'100%'}}
                  resizeMode='contain'
                />
              </TouchableOpacity>
        </View>
        )}

        {/* ── Bouton retour maintenant (flottant) ── */}
        {!vueCalendrier && (
        <Animated.View
          style={[
            retourMaintenantAnime,
            s.backToNow,
            // Centered on the member's photo line once measured (bottom offset until then).
            centreRangeeMembre !== undefined
              ? { top: centreRangeeMembre - HAUTEUR_RETOUR / 2, bottom: undefined }
              : null,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <TouchableOpacity
            onPress={retourMaintenant}
            style={s.backToNowInner}
            accessibilityRole="button"
            accessibilityLabel={t('backToNow')}
          >
            <Animated.View style={[s.calqueFleche, flecheDroiteAnime]}>
              <Image source={icones.arrowR} style={s.flecheRetour} resizeMode="contain" />
            </Animated.View>
            <Animated.View style={[s.calqueFleche, flecheGaucheAnime]}>
              <Image source={icones.arrowL} style={s.flecheRetour} resizeMode="contain" />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
        )}

      </View>
    </GestureHandlerRootView>
  );
}
