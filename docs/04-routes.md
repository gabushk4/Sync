# 📁 CATÉGORIE : ROUTES EXPO ROUTER

## Configuration Expo Router :
- `app.json` - Activation de typedRoutes
- `app/_layout.tsx` - Root layout avec providers et protection des routes

## Routes Tabs (app/(tabs)/) :
- `home/index.tsx` - Écran d'accueil avec timeline horizontal
- `home/calendrier.tsx` - Calendrier mensuel (sélection d'un jour / d'une plage, « + » pour créer) — Philip, US5
- `home/create.tsx` - Création d'événement (fenêtre de conflit si chevauchement — US8)
- `home/details/[eventId].tsx` - Détails d'un événement ; avec le paramètre `invitation` : page de décision (lecture seule, accepter / refuser) — Philip, US8
- `home/revueInvitation.tsx` - Revue d'une invitation en conflit : horaires de l'organisateur, des invités et du membre — Philip, US8
- `home/edit/[event].tsx` - Édition d'événement
- `profile/index.tsx` - Profil utilisateur
- `profile/[membreId].tsx` - Profil d'un autre membre
- `profile/settings/index.tsx` - Paramètres
- `profile/edit.tsx` - (contenu non vérifié)
- `feed/index.tsx` - Flux de notifications
- `feed/notifications/list.tsx` - Liste des notifications
- `inbox/index.tsx` - Boîte de réception
- `placeholder.tsx` - Espace réservé au FAB dans la tab bar

## Routes Auth (app/(auth)/) :
- `login.tsx` - Connexion
- `register.tsx` - Inscription

## Routes Modals (app/(modals)/) :
- `ajouterAmi.tsx` - Ajouter un ami
- `listeAmis.tsx` - Liste des amis
- `confirm.tsx` - Modals de confirmation
- `dataRenderer.tsx` - (contenu non vérifié)

## Protection des Routes :
```typescript
// app/_layout.tsx — seuls (tabs) et (auth) sont derrière un guard.
// (modals) et scanQR sont des écrans Stack hors guard.
<Stack.Protected guard={state === 'authenticated'}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
</Stack.Protected>

<Stack.Protected guard={state === 'unauthenticated'}>
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
</Stack.Protected>
<Stack.Screen
  name="(modals)"
  options={{
    presentation: 'transparentModal',
    animation: 'none',
    gestureEnabled: false,
    headerShown: false,
  }}
/>
<Stack.Screen name="scanQR" options={{ headerShown: false }} />
```

## Gestion du Chargement (AppLoader) :
- Vérification fontsLoaded, settingsLoaded, localeLoaded
- Initialisation de la localisation
- Masquage de la splash screen
