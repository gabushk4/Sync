import { useAPI } from '@/contextes/contexteAPI';
import { useGestionScroll } from '@/contextes/contexteGestionListes';
import { usePalette } from '@/contextes/contextePalette';

import { useNavFab } from '@/hooks/useNavFAB';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ouvrirDetailsEvenement from '@/functions/ouvrirDetailsEvenement';
import { useTranslation } from 'react-i18next';
import Animated, { cancelAnimation, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue, withDecay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { DateTime } from 'luxon';

import { Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { getCommonFreeSlots } from '@/functions/availability';
import catcher from '@/functions/catcher';
import { convertLocalToUTC, convertUTCToLocal } from '@/functions/convertirUTCenLocal';
import log from '@/functions/log';


import EventsList, { RETRAIT_RANGEE } from '@/components/eventsList';
import ProfilPic from '@/components/pfp';
import Spinner from '@/components/spinner';
import Timeline from '@/components/timeline';
import { useFont } from '@/contextes/contexteFont';
import { useMembre } from '@/contextes/contexteMembre';
import { useTimeline } from '@/contextes/contexteTimeline';


//dummy datas
//import {seedData} from '@/seed'
import { withSpringConfig } from '@/constants/ReanimatedConfs';
import AutoRefresh from '@/functions/autoRefresh';
import { formaterEvenementsMembre, paramsJour } from '@/functions/evenementsMembre';
import { debutCreationPourJour, estJourPasse } from '@/functions/jourCreation';
import { calendrierEvents } from '@/events/calendrierEvents';
import { Friend } from '@/types/calendar';
import formaterDatePourServeur from '@/functions/formaterDatePourServeur';
import { scheduleOnRN } from 'react-native-worklets';

//Constants
const WIDTH_COL = 80;
const HEIGHT_BOT_BAR = 80;
const HEIGHT_DATE = 56;
const HEIGHT_TIMELINE = 32;
const AnimatedStyleMinVal = 0.1
const LIST_HEIGHT = 104
// Height of the floating back-to-now button.
const HAUTEUR_RETOUR = 34
// Max events per request in the month view (the API defaults to 20, too few for a month).


// "Back to today" tab in the bottom bar (against the screen's edge): width and
// corner radius.
const LARGEUR_ONGLET = 52
const RAYON_ONGLET = 10
const { width: WIN_W, height: WIN_H } = Dimensions.get('window')

/**
 * Short month name of `dt` for the "back to today" tab ("oct", "janv"), without
 * the abbreviation dot. Falls back to the first letters of the full name ('MMMM',
 * as in the calendar) if the short form isn't available.
 *
 * @author Philip Kvaratshelya — rectification for a more conventional display
 * @param {DateTime} dt
 * @returns {string}
 */
function abregerMois(dt: DateTime): string {
  const court = dt.toFormat('MMM')
  if (court && !court.includes('null')) return court.replace(/\.$/, '')
  return dt.toFormat('MMMM').slice(0, 4)
}

/**
 * Home screen. Shows the displayed day as horizontal timeline rows: one per
 * friend (their events + free slots shared with the member), and the member's
 * own row at the bottom. The date button opens the month calendar page (user
 * story 5). The rows poll the API (AutoRefresh) for the displayed day, so an
 * accepted invitation shows up on both members' rows (user story 9).
 *
 * @author Philip Kvaratshelya — rectification for a more conventional display:
 *   - coming back to this screen keeps the displayed day (it reset to today);
 *   - a "back to today" tab in the bottom bar, against the edge on the side where
 *     now is, replaces the floating arrows that covered the timeline;
 *   - a day fully taken by one event shows a fixed "Fully booked" card instead of
 *     an empty-looking timeline;
 *   - days already seen are cached and the neighbouring days prefetched, so
 *     switching days no longer shows the previous day's events for a second;
 *   - common free slots wait for the displayed day's events (they flickered),
 *     and today's elapsed hours stay visible, greyed out.
 * @returns {JSX.Element}
 */
export default function Home() {
  const { t } = useTranslation('home')
  const { colors } = usePalette()
  const { fonts } = useFont()
  const { api } = useAPI()
  const colorScheme = useColorScheme()
  const { initialiserOffset, afficherRetourMaintenant, onPan, offset: offsetX, LEFT_GO_TO_AFTER, clampOffset, maxOffset } = useGestionScroll()
  const { pxHeures, L_HEURES } = useTimeline();
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
  const friendsList = useAnimatedRef<Animated.ScrollView>()
  const friendsEventsRefresh = useRef<AutoRefresh>(null)
  const userEventsRefresh = useRef<AutoRefresh>(null)

  //Sates
  const [, setCurrentTime] = useState<DateTime>()
  const [friends, setFriends] = useState<Array<any>>([])
  const [userEvents, setUserEvents] = useState<Array<any>>([])
  const [todayDateTime, setTodayDateTime] = useState<DateTime>()
  // Day the member's / friends' loaded events belong to. Until both match the
  // displayed day, the previous day's events are still on screen: the common free
  // slots were computed from them for a moment, then vanished once loaded.
  const [jourMembre, setJourMembre] = useState<DateTime>()
  const [jourAmis, setJourAmis] = useState<DateTime>()
  // Day of the last events request, read by the AutoRefresh callbacks.
  const jourDemandeRef = useRef<DateTime | undefined>(undefined)
  // The member's events per day already loaded (key: ISO date), plus the days
  // being prefetched. A day in the cache shows at once when switching to it, so a
  // fully booked day no longer shows the previous day's timeline for a second.
  const cacheJoursRef = useRef<Map<string, any[]>>(new Map())
  const prechargementsRef = useRef<Set<string>>(new Set())
  // The displayed day, readable from the focus effect (created once), so coming
  // back to this screen keeps it instead of resetting to today.
  const jourAfficheRef = useRef<DateTime | undefined>(undefined)
  useEffect(() => { jourAfficheRef.current = todayDateTime }, [todayDateTime])

  // Whether the loaded events are the displayed day's (see jourMembre / jourAmis).
  const evenementsMembreAJour = !!todayDateTime && !!jourMembre?.hasSame(todayDateTime, 'day')
  const evenementsAmisAJour = !!todayDateTime && !!jourAmis?.hasSame(todayDateTime, 'day')

  // An event of the member's covering the whole displayed day: the member's row
  // then shows a fixed "fully booked" card instead of the scrolling timeline.
  const evenementJourneeComplete = useMemo(() => {
    if (!todayDateTime || !evenementsMembreAJour) return undefined
    const debutJour = todayDateTime.startOf('day')
    // One minute of slack: a whole-day event often ends at 23:59(:59).
    const finJour = debutJour.plus({ days: 1 }).minus({ minutes: 1 })
    return userEvents.find((ev: any) => ev?.debut && ev?.fin && ev.debut <= debutJour && ev.fin >= finJour)
  }, [userEvents, todayDateTime, evenementsMembreAJour])

  // Common free slots only once both rows hold the displayed day's events, and
  // none on a fully booked day.
  const dispoCommunesPossibles = evenementsMembreAJour && evenementsAmisAJour && !evenementJourneeComplete
  const [chargementEchec, setChargementEchec] = useState(false)
  const [chargementEvenements, setChargementEvenements] = useState(false)
  // Pre-fills the create screen with the day currently displayed, at the suggested
  // hour (see debutCreationPourJour).
  const debutCreation = todayDateTime && debutCreationPourJour(todayDateTime)


  //SharedValues
  const evAmisOffset = useSharedValue(0)
  const dateAujShared = useSharedValue<number>(0)
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

  // "Back to today" tab in the bottom bar (replaces the floating arrows that sat on
  // the timeline). It keeps their behaviour: shown when now isn't on screen (another
  // day, or today scrolled away from the current hour), on the side where now is —
  // right when now is later (a past day), left when now is earlier (a future day) —
  // springing from one edge to the other and fading in / out.
  // jourRelatif: -1 past day, 0 today, 1 future day.
  const jourRelatif = useSharedValue(0)
  useEffect(() => {
    if (!todayDateTime) return
    const aujourdhui = DateTime.now().startOf('day')
    jourRelatif.value = todayDateTime < aujourdhui ? -1 : todayDateTime > aujourdhui ? 1 : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDateTime])

  // Mirrors the tab's visibility for touches (a faded-out tab mustn't catch taps).
  const [ongletVisible, setOngletVisible] = useState(false)
  // Current time shown in the tab (see texteOnglet).
  const [maintenantOnglet, setMaintenantOnglet] = useState(() => DateTime.now())
  /**
   * The tab is shown / hidden: records it, and refreshes its clock when shown.
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display
   * @param {boolean} visible
   * @returns {void}
   */
  const changerVisibiliteOnglet = (visible: boolean) => {
    setOngletVisible(visible)
    if (visible) setMaintenantOnglet(DateTime.now())
  }

  // Tab label, by how far the displayed day is from today: the current time on
  // today (timeline scrolled away from now), today's day of the month in the same
  // month, else today's month abbreviation ("oct", "janv" — locale-aware). Kept up
  // to date every 30 s while the tab is shown.
  useEffect(() => {
    if (!ongletVisible) return
    const minuteur = setInterval(() => setMaintenantOnglet(DateTime.now()), 30000)
    return () => clearInterval(minuteur)
  }, [ongletVisible])
  const surAujourdhui = !todayDateTime || todayDateTime.hasSame(maintenantOnglet, 'day')
  const dansLeMois = !todayDateTime || todayDateTime.hasSame(maintenantOnglet, 'month')
  const texteOnglet = surAujourdhui
    ? maintenantOnglet.toFormat('HH:mm')
    : dansLeMois
      ? String(maintenantOnglet.day)
      // Luxon's short month name, without its abbreviation dot ("janv." → "janv").
      // 'MMM', not the standalone 'LLL': Hermes' Intl returns null for the latter
      // (the tab showed "null"); the calendar's 'MMMM' uses the same 'MMM' family.
      : abregerMois(maintenantOnglet)
  useAnimatedReaction(
    () => jourRelatif.value !== 0 || afficherRetourMaintenant.value.afficher,
    (visible, precedent) => {
      if (visible !== precedent) scheduleOnRN(changerVisibiliteOnglet, visible)
    }
  )

  const ongletAujourdhuiAnime = useAnimatedStyle(() => {
    const visible = jourRelatif.value !== 0 || afficherRetourMaintenant.value.afficher
    const aDroite = jourRelatif.value < 0
      || (jourRelatif.value === 0 && afficherRetourMaintenant.value.left === LEFT_GO_TO_AFTER)
    // Only the side away from the screen's edge is rounded.
    const arrondiGauche = withTiming(aDroite ? RAYON_ONGLET : 0, { duration: 200 })
    const arrondiDroite = withTiming(aDroite ? 0 : RAYON_ONGLET, { duration: 200 })
    return {
      left: withSpring(aDroite ? WIN_W - LARGEUR_ONGLET : 0, { mass: 1.6, damping: 20 }),
      opacity: withTiming(visible ? 1 : 0, { duration: 300 }),
      borderTopLeftRadius: arrondiGauche,
      borderBottomLeftRadius: arrondiGauche,
      borderTopRightRadius: arrondiDroite,
      borderBottomRightRadius: arrondiDroite,
    }
  })
  /**
   * AutoRefresh callback for GET /evenements: converts the member's events to
   * local DateTimes, sorts them earliest first, stores them for the member's row
   * and caches them under the requested day.
   * Updated for user story 9. SUBJECT TO CHANGE: may be revised depending on how
   * teammates implement their own user stories.
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display (records the loaded day + cache)
   * @param {{ evenements?: Array<Object> }} data - API response body.
   * @returns {void}
   */
  const modifierEvenementsMembreFetched = (data: any)=>{
    try {
      log("modifierEvenementsMembreFetched", data && true)
      if (data.evenements) {
        const evenements = formaterEvenementsMembre(data.evenements, membre.timezone)
        const cle = jourDemandeRef.current?.toISODate()
        if (cle) cacheJoursRef.current.set(cle, evenements)
        setUserEvents(evenements)
        setJourMembre(jourDemandeRef.current)
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
   * @author Philip Kvaratshelya — rectification for a more conventional display (records the loaded day, see jourAmis)
   * @param {{ resultat?: Friend[] }} data - API response body.
   * @returns {void}
   */
  const modifierEvenementsAmisFetched = (data: any) => {
    const events = data.resultat ?? []
    log("modifier evenements amis data: ", data && true)
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

      setJourAmis(jourDemandeRef.current)
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
   * Reloads the member's and friends' events for the given day. setParams cancels
   * the request still in flight for the previous day. Sends `debut`/`fin`
   * (paramsJour), the names the events API reads. Shows the cached day at once and
   * prefetches its neighbours.
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display (cache + prefetch)
   * @param {DateTime} dt - Any moment of the day to load.
   * @returns {void}
   */
  const refreshAt = (dt: DateTime) => {
    jourDemandeRef.current = dt.startOf('day');
    afficherDepuisCache(dt);
    const extraParams = paramsJour(dt);
    userEventsRefresh.current?.setParams(extraParams);
    friendsEventsRefresh.current?.setParams(extraParams);
    prechargerJours(dt);
  };

  /**
   * Shows the member's cached events for `dt` right away (the AutoRefresh answer
   * then replaces them with fresh ones). No-op when the day isn't cached: the
   * member's row then stays blank until it loads (see evenementsMembreAJour).
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display
   * @param {DateTime} dt - Day about to be displayed.
   * @returns {void}
   */
  const afficherDepuisCache = (dt: DateTime) => {
    const enCache = cacheJoursRef.current.get(dt.toISODate() ?? '')
    if (!enCache) return
    setUserEvents(enCache);
    setJourMembre(dt.startOf('day'));
  };

  /**
   * Loads the member's events of the day before and after `dt` (and of `dt`
   * itself with `avecJour`) into the cache, so the arrows switch days without
   * waiting. A prefetched day that is the displayed one is shown at once. Errors
   * are ignored: the day then simply loads when shown.
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display
   * @param {DateTime} dt - Displayed (or about to be displayed) day.
   * @param {boolean} [avecJour=false] - Also load `dt` (the AutoRefresh isn't
   *   running, e.g. while the calendar page covers this screen).
   * @returns {void}
   */
  const prechargerJours = (dt: DateTime, avecJour = false) => {
    const jours = [dt.minus({ days: 1 }), ...(avecJour ? [dt] : []), dt.plus({ days: 1 })]
    for (const jour of jours) {
      const cle = jour.toISODate() ?? ''
      if (cacheJoursRef.current.has(cle) || prechargementsRef.current.has(cle)) continue
      prechargementsRef.current.add(cle)
      api.get('/evenements/', { params: { ...paramsJour(jour), force_refresh: true } })
        .then((reponse) => {
          // A fresher answer from the AutoRefresh wins.
          if (!reponse.data?.evenements || cacheJoursRef.current.has(cle)) return
          cacheJoursRef.current.set(cle, formaterEvenementsMembre(reponse.data.evenements, membre.timezone))
          if (jourDemandeRef.current?.toISODate() === cle) afficherDepuisCache(jour)
        })
        .catch(() => {})
        .finally(() => prechargementsRef.current.delete(cle))
    }
  };

  /**
   * A day was selected in the calendar page (see calendrierEvents): switches to it
   * right away, while this screen is still hidden under the calendar, so going back
   * shows the timeline already on that day instead of switching during the
   * transition. Its events come from the cache / a prefetch; the AutoRefresh starts
   * again on focus, on this day.
   *
   * @author Philip Kvaratshelya — user story 5 (month calendar)
   * @param {DateTime} jour - Selected day (a range's first day).
   * @returns {void}
   */
  const appliquerJourCalendrier = (jour: DateTime) => {
    if (jourAfficheRef.current?.hasSame(jour, 'day')) return
    setTodayDateTime(jour.startOf('day'));
    dateAujShared.value = jour.toMillis();
    jourDemandeRef.current = jour.startOf('day');
    afficherDepuisCache(jour);
    prechargerJours(jour, true);
  };

  // Follows the calendar page's selection (created once: the handler only uses
  // refs, setters and the API).
  useEffect(() => calendrierEvents.abonner((jour) => appliquerJourCalendrier(jour)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [])

  /**
   * Arrows of the bottom bar: shows the previous / next day.
   *
   * @param {number} delta - -1 for the previous day, 1 for the next one.
   * @returns {void}
   */
  const changerJour = (delta: number) => {
    if (!todayDateTime) return;
    const newDt = todayDateTime.plus({ days: delta });
    setTodayDateTime(newDt);
    dateAujShared.value = newDt.toMillis();
    refreshAt(newDt);
  };

  const reculerDate = () => changerJour(-1);
  const avancerDate = () => changerJour(1);

  /**
   * Date button (calendar icon): opens the month calendar page on the displayed day
   * (user story 5). Coming back shows the day selected there (see the focus effect).
   *
   * @author Philip Kvaratshelya — user story 5 (month calendar)
   * @returns {void}
   */
  const ouvrirCalendrier = () => {
    router.push({
      pathname: '/(tabs)/home/calendrier' as any,
      params: { jour: (todayDateTime ?? DateTime.now()).toISODate() },
    })
  }

  /**
   * "Back to today" tab (bottom bar): scrolls the timeline to the current hour
   * and, if another day was displayed, switches back to today and refetches its
   * events.
   *
   * @author Philip Kvaratshelya — rectification for a more conventional display
   * @returns {void}
   */
  const retourMaintenant = () => {
    const now = DateTime.now();
    initialiserOffset(now.hour * (pxHeures + L_HEURES));
    // hasSame: comparing only `.day` missed e.g. the 10th of another month.
    if (!todayDateTime?.hasSame(now, 'day')) {
      setTodayDateTime(now.startOf('day'));
      dateAujShared.value = now.toMillis();
      refreshAt(now)
    }
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

  useNavFab("home", {
    href: '/home/create',
    params: debutCreation ? { start: debutCreation.toISO() } : undefined,
    icon: null,
    visible: true,
    // No events in the past: on a day before today, the "+" shows an error instead.
    bloque: todayDateTime && estJourPasse(todayDateTime) ? t('create.pastDate', { ns: 'events' }) : undefined,
  })

  useFocusEffect(
    useCallback(() => {
      const now = DateTime.now();
      // Keep the day that was displayed — already the calendar's selection when
      // coming back from it (see appliquerJourCalendrier). It used to reset to
      // today; the "today" tab in the bottom bar does that now. First visit: today.
      const jourAffiche = jourAfficheRef.current ?? now
      setTodayDateTime(jourAffiche.startOf('day'));
      setCurrentTime(now);
      dateAujShared.value = jourAffiche.toMillis();
      jourDemandeRef.current = jourAffiche.startOf('day');
      afficherDepuisCache(jourAffiche);
      prechargerJours(jourAffiche);
      //chargerEvenements(now, now)

      userEventsRefresh.current = new AutoRefresh(api, '/evenements/', {
        extraParams: paramsJour(jourAffiche),
        onData: modifierEvenementsMembreFetched,
        onError: (error) => {
          log("impossible de charger les évènements du membre", error)
          // Stops the member row's spinner: an empty row (the error toast says why)
          // instead of waiting forever. Rectification (Philip Kvaratshelya).
          setUserEvents([])
          setJourMembre(jourDemandeRef.current)
          catcher(error, t('errors.loadMemberEvents'))
        }
      })

      friendsEventsRefresh.current = new AutoRefresh(api, '/evenements/amis', {
        extraParams: paramsJour(jourAffiche),
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
    // Arrows + date button grouped in the middle, the date button exactly above the
    // centered "+" button (the arrows used to sit against the edges, and their
    // unequal widths pushed the date button off-center). The "back to today" tab
    // stays against the edges (absolute).
    // Philip Kvaratshelya — rectification for a more conventional display.
    botBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.card,
      height: HEIGHT_BOT_BAR,
      borderColor:colors.border
    },
    // Same fixed size on both sides, so the date button stays centered.
    arrow: {
      height: 32,
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Date pill in the bottom bar: calendar icon + displayed date, opens the month view (user story 5).
    boutonDate: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // Fixed minimum width: a longer date ("30 sept.") doesn't push the arrows.
      minWidth: 136,
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
    // "Today" tab: flush with the screen's left or right edge, inside the bar's
    // side padding (its left position and corners are animated).
    ongletAujourdhui: {
      position: 'absolute',
      width: LARGEUR_ONGLET,
      height: 40,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
    },
    boutonAujourdhui: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Today's day of the month, inside the "today" tab.
    texteAujourdhui: {
      color: colors.background,
      fontFamily: fonts.title,
      fontSize: 16,
    },
    // The time ("14:37") and a month ("sept") are wider than a day number: smaller
    // so they fit the tab.
    texteMaintenant: {
      fontSize: 13,
    },
    // Member's timeline + the fixed "fully booked" card laid over it.
    zoneTimelineMembre: {
      flex: 1,
      justifyContent: 'center',
    },
    journeeComplete: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      paddingVertical: RETRAIT_RANGEE,
      paddingHorizontal: 8,
      backgroundColor: colors.card,
    },
    chargementMembre: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    carteJourneeComplete: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 16,
      gap: 2,
      borderRadius: 12,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.secondary,
    },
    texteJourneeComplete: {
      color: colors.secondary,
      fontFamily: fonts.title,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    titreJourneeComplete: {
      color: colors.text,
      fontFamily: fonts.title,
      fontSize: 18,
    },
    texteDate: {
      color: colors.text,
      fontFamily: fonts.title,
      fontSize: 16,
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
          <View
            style={s.calendarContainer}
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
                      const commonFreeSlots = dispoCommunesPossibles
                        ? getCommonFreeSlots(userEvents, friend.evenements, todayDateTime)
                        : []
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
          >
              <View style={[s.column, { backgroundColor: colors.card }]}>
                <ProfilPic
                  size={64}
                  pfp={membre.fp}
                />
              </View>    
              <View style={s.zoneTimelineMembre}>
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
                {/* Fully booked day: a fixed card over the (still mounted) timeline, so
                    it doesn't scroll and the timeline comes back as it was on a normal day. */}
                {/* Day not loaded yet (not cached): blank row instead of the previous
                    day's timeline, until it's known whether the day is fully booked. */}
                {!evenementsMembreAJour && (
                  <View style={[s.journeeComplete, s.chargementMembre]}>
                    <Spinner size={24} color={colors.muted} />
                  </View>
                )}
                {evenementJourneeComplete && (
                  <View style={s.journeeComplete}>
                    <TouchableOpacity
                      style={s.carteJourneeComplete}
                      onPress={() => ouvrirDetailsEvenement(evenementJourneeComplete)}
                      accessibilityRole="button"
                    >
                      <Text style={s.texteJourneeComplete}>{t('fullyBooked')}</Text>
                      <Text style={s.titreJourneeComplete} numberOfLines={1}>
                        {evenementJourneeComplete.titre?.trim() || t('untitledEvent')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
        </View>
        </GestureDetector>

        {/* ── Bottom bar (arrows + date button opening the calendar page) ── */}
        <View style={[s.botBar]}>
              {/* One tap back to today / now: a tab against the screen's edge, on the
                  side where now is (see ongletAujourdhuiAnime). Absolutely positioned
                  so the arrows and the date button don't move. */}
              <Animated.View
                style={[s.ongletAujourdhui, ongletAujourdhuiAnime]}
                pointerEvents={ongletVisible ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={s.boutonAujourdhui}
                  onPress={retourMaintenant}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={surAujourdhui ? t('backToNow') : t('backToToday')}
                >
                  <Text style={[s.texteAujourdhui, !(dansLeMois && !surAujourdhui) && s.texteMaintenant]} numberOfLines={1}>
                    {texteOnglet}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={s.arrow} onPress={reculerDate}>
                <Image
                  source={icones.arrowL}
                  style={{height:'100%', width:'100%'}}
                  resizeMode='contain'
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.boutonDate} onPress={ouvrirCalendrier}>
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
                  style={{height:'100%', width:'100%'}}
                  resizeMode='contain'
                />
              </TouchableOpacity>
        </View>

      </View>
    </GestureHandlerRootView>
  );
}
