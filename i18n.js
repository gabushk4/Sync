// i18n.js
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frAuth from './locales/fr/auth.json';
import frCalendar from './locales/fr/calendar.json';
import frCommon from './locales/fr/common.json';
import frEvents from './locales/fr/events.json';
import frFeed from './locales/fr/feed.json';
import frFriends from './locales/fr/friends.json';
import frHome from './locales/fr/home.json';
import frInbox from './locales/fr/inbox.json';
import frNotifications from './locales/fr/notifications.json';
import frProfile from './locales/fr/profile.json';
import frScanQR from './locales/fr/scanQR.json';
import frSettings from './locales/fr/settings.json';

import enAuth from './locales/en/auth.json';
import enCalendar from './locales/en/calendar.json';
import enCommon from './locales/en/common.json';
import enEvents from './locales/en/events.json';
import enFeed from './locales/en/feed.json';
import enFriends from './locales/en/friends.json';
import enHome from './locales/en/home.json';
import enInbox from './locales/en/inbox.json';
import enNotifications from './locales/en/notifications.json';
import enProfile from './locales/en/profile.json';
import enScanQR from './locales/en/scanQR.json';
import enSettings from './locales/en/settings.json';

i18n.use(initReactI18next).init({
  resources: {
        fr: { common: frCommon, home: frHome, events: frEvents, friends: frFriends, calendar: frCalendar, settings: frSettings, auth: frAuth, feed: frFeed, profile: frProfile, inbox: frInbox, notifications: frNotifications, scanQR: frScanQR },
      en: { common: enCommon, home: enHome, events: enEvents, friends: enFriends, calendar: enCalendar,  settings: enSettings, auth: enAuth, feed: enFeed, profile: enProfile, inbox: enInbox, notifications: enNotifications, scanQR: enScanQR},
  },
    ns: ['common', 'home', 'events', 'profile', 'settings', 'auth', 'scanQR', 'friends', 'feed', 'notifications', 'inbox', 'calendar', ],
  defaultNS: 'common',
  lng: Localization.getLocales()[0].languageCode,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;