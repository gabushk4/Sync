# 📁 CATÉGORIE : CONTEXTES GLOBAUX

## Fichiers de cette catégorie :
- `contexteAPI.tsx` - Client API global avec axios et intercepteurs JWT
- `contexteAuth.tsx` - Gestion authentification (login, register, signOut)
- `contexteMembre.tsx` - Données utilisateur (pseudo, bio, photo, timezone)
- `contexteModals.tsx` - Gestion des modals (stack ouverts, ouvrir/fermer)
- `contexteSettings.tsx` - Paramètres utilisateur (langue, thème)
- `contexteToken.tsx` - Gestion des tokens (AccessTokenProvider)
- `contextePalette.tsx` - Thèmes de couleurs (couleurs dynamiques HSL)
- `contexteFont.tsx` - Gestion des polices (chargement, useFont hook)
- `contexteTimeline.tsx` - État du timeline (offset horizontal, heure)
- `contexteGestionListes.tsx` - Scroll management (inertiel, snap to hour)
- `contexteInvites.tsx` - Invitations (liste, privilèges)
- `contexteNotifications.tsx` - Notifications (stockage, permissions)
- `contexteEventDraft.tsx` - Brouillon d'événement (état temporaire)
- `contexteRoute.tsx` - Routes absolues (fonction ajouterEcran)
- `contexteMockMode.tsx` - Mode simulation (données fictives)

## Ordre des Providers dans app/_layout.tsx :
FontProvider → AccessTokenProvider → MockModeProvider → APIProvider →
SettingsProvider → PaletteProvider → MembreProvider → AuthProvider →
NotificationProvider → RouteAbsProvider → ModalProvider →
NavFABProvider → ActionFABProvider → TimelineProvider →
GestionScrollProvider → InvitesProvider → EventDraftProvider → RootLayoutNav

## Pattern d'utilisation :
```typescript
import { useAPI } from '@/contextes/contexteAPI';
import { useMembre } from '@/contextes/contexteMembre';
import { usePalette } from '@/contextes/contextePalette';
```
