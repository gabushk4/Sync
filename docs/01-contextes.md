# 📁 CATÉGORIE : CONTEXTES GLOBAUX

## Fichiers de cette catégorie (`contextes/`, 20 fichiers) :
- `contexteAPI.tsx` - Client API global avec axios et intercepteurs JWT
- `contexteAuth.tsx` - Gestion authentification (`signIn`, `signOut`, `recheckAuth`, état `loading | authenticated | unauthenticated`)
- `contexteMembre.tsx` - Données utilisateur (pseudo, bio, photo, timezone, `emailConfirme`, `getMembre`/`patchProfil`)
- `contexteModals.tsx` - Gestion des modals (stack ouverts, ouvrir/fermer)
- `contexteSettings.tsx` - Paramètres utilisateur (`language`, `timezone`, `theme: number`, `hydrated: boolean`)
- `contexteToken.tsx` - Gestion des tokens (`getToken`, `setToken`, `resetTokens`, expirations access 1h / refresh 30j, SecureStore)
- `contextePalette.tsx` - Thèmes de couleurs (teinte HSL + `generateTheme`, `colors`, `navTheme`)
- `contexteFont.tsx` - Gestion des polices (`fonts`, `fontsLoaded`)
- `contexteTimeline.tsx` - État du timeline (offset horizontal, heure)
- `contexteGestionListes.tsx` - Scroll management (inertiel, snap to hour)
- `contexteInvites.tsx` - Invitations (`ajouterInvite`, liste, privilèges)
- `contexteNotifications.tsx` - Notifications (stockage, permissions, `push_token`)
- `contexteEventDraft.tsx` - Brouillon d'événement (état temporaire, `makeReq`)
- `contexteRoute.tsx` - Routes absolues (fonction ajouterEcran)
- `contexteMockMode.tsx` - Mode simulation (données fictives)
- `contexteNavFAB.tsx` - FAB de navigation (`FabProvider`, config `href` + `params` par écran via `useNavFab`)
- `contextActionFAB.tsx` - FAB d'action (`FabProvider`, `action` + `icon` par écran via `useActionFab`)
- `contexteListeOptions.js` - (contenu non vérifié)
- `contexteListesVisibles.js` - (contenu non vérifié)
- `contexteLogs.js` - (contenu non vérifié)

## Ordre des Providers dans app/_layout.tsx :
FontProvider → AccessTokenProvider → MockModeProvider → APIProvider →
SettingsProvider → PaletteProvider → MembreProvider → AuthProvider →
NotificationProvider → RouteAbsProvider → ModalProvider →
NavFABProvider → ActionFABProvider → TimelineProvider →
GestionScrollProvider → InvitesProvider → AppLoader →
(EventDraftProvider → RootLayoutNav) — `EventDraftProvider` est monté dans `AppLoader`, pas à la racine.

## Pattern d'utilisation :
```typescript
import { useAPI } from '@/contextes/contexteAPI';
import { useMembre } from '@/contextes/contexteMembre';
import { usePalette } from '@/contextes/contextePalette';
```
