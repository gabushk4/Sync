# 11. Spécificités Expo SDK 57

## Vue d'ensemble

Cette section contient les spécificités techniques liées au SDK Expo 57
(`expo ~57.0.23`, `expo-router ~57.0.21` — voir `package.json`), et les bonnes
pratiques spécifiques à cette version.

---

## Expo Router

### Configuration dans `app.json`

```json
{
  "experiments": {
    "typedRoutes": true  // Activation des routes typées
  }
}
```

### Structure des Routes

- **Routes Tabs** : `app/(tabs)/` - Navigation principale
- **Routes Auth** : `app/(auth)/` - Écrans de connexion/inscription
- **Routes Modals** : `app/(modals)/` - Modals overlay
- **Layouts** : `app/_layout.tsx` - Layout racine avec providers

### Typed Routes

`typedRoutes: true` est activé (`app.json`). Exemple de navigation typée
utilisée dans le code (`details/[eventId].tsx`) :

```typescript
useNavFab({
  href: '/(tabs)/home/edit/[event]' as const,
  params: FABParams, // { event: string }
});
```

---

## Gestion du Chargement

### AppLoader dans `app/_layout.tsx`

```typescript
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
  
  return <EventDraftProvider makeReq={false}><RootLayoutNav /></EventDraftProvider>;
}
```

### Séquence de Chargement

1. **Fonts** - Chargement des polices
2. **Settings** - Récupération des paramètres utilisateur
3. **Locale** - Initialisation de la localisation
4. **Splash Screen** - Masquage de l'écran de démarrage
5. **Application** - Affichage de l'application principale

---

## Gestion des Permissions du Système

### Hook `useSettings` dans l'écran de paramètres

```typescript
const { settings: values, hydrated, setSetting } = useSettings()
```

### Permissions Gérées

- **Camera** : `expo-camera`
- **Location** : `expo-location`
- **Notifications** : `expo-notifications`

### Gestion des Permissions

```typescript
const [permissions, setPermissions] = useState<Permissions>()

const getPermissions = async () => {
  const [camera, notifications, location] = await Promise.all([
    getCameraPermission(),
    Notifications.getPermissionsAsync(),
    Location.getForegroundPermissionsAsync(),
  ]);

  setPermissions({
    camera: { granted: camera.granted, canAskAgain: camera.canAskAgain },
    location: { granted: location.granted, canAskAgain: location.canAskAgain },
    notifications: {
      granted: notifications.granted ||
        notifications.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
      canAskAgain: notifications.canAskAgain,
    },
  })
}
```

---

## Utilisation de `useTranslation`

### Importation

```typescript
import { useTranslation } from "react-i18next";
```

### Appel du Hook

```typescript
const { t } = useTranslation('settings')
```

### Utilisation dans le JSX

```typescript
<Text>{t('timezone')}</Text>
<Text>{t('french')}</Text>
<Text>{t('deleteAccount')}</Text>
```

### Clés avec Paramètres

```typescript
<Text>{t('appVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
```

---

## Notes

- Versions installées : voir `package.json` (`expo`, `expo-router`, `react-native`)
- Les permissions du système doivent être demandées explicitement
- La localisation est gérée via i18next avec support FR/EN
