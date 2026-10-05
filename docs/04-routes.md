# 📁 CATÉGORIE : ROUTES EXPO ROUTER

## Configuration Expo Router :
- `app.json` - Activation de typedRoutes
- `app/_layout.tsx` - Root layout avec providers et protection des routes

## Routes Tabs (app/(tabs)/) :
- `home/index.tsx` - Écran d'accueil avec timeline horizontal
- `home/create.tsx` - Création d'événement
- `home/details/[eventId].tsx` - Détails d'un événement
- `profile/index.tsx` - Profil utilisateur
- `feed/index.tsx` - Flux de notifications
- `inbox/index.tsx` - Boîte de réception

## Routes Auth (app/(auth)/) :
- `login.tsx` - Connexion
- `register.tsx` - Inscription

## Routes Modals (app/(modals)/) :
- `ajouterAmi.tsx` - Ajouter un ami
- `listeAmis.tsx` - Liste des amis
- `confirm.tsx` - Modals de confirmation

## Protection des Routes :
```typescript
<Stack.Protected guard={state === 'authenticated'}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
</Stack.Protected>

<Stack.Protected guard={state === 'unauthenticated'}>
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
</Stack.Protected>
```

## Gestion du Chargement (AppLoader) :
- Vérification fontsLoaded, settingsLoaded, localeLoaded
- Initialisation de la localisation
- Masquage de la splash screen
