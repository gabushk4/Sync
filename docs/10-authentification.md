# 10. Système d'Authentification

## Vue d'ensemble

Cette section contient tout ce qui concerne l'authentification : flux d'authentification, protection des routes, gestion des tokens JWT, et vérification des permissions.

---

## Flux d'Authentification

### 1. Inscription (`app/(auth)/register.tsx`)

- Formulaire pseudo + courriel + mot de passe (+ confirmation)
- `POST /membres/inscription` avec `{ pseudo, mot_de_passe, courriel, fuseau_horaire }`
- En cas de 201 : toast de succès, **pas de token créé**
- Redirection vers `/(auth)/login` après ~300ms (l'utilisateur se connecte ensuite)

### 2. Connexion (`app/(auth)/login.tsx`)

- Formulaire pseudo + mot de passe (mot de passe > 8 caractères requis côté client)
- `POST /membres/connexion` → `{ access_token, refresh_token }`
- `signIn(access_token, refresh_token)` : access token en SecureStore (via contexte), refresh token en SecureStore, `getMembre()`, état `authenticated`
- Toast de bienvenue `login.welcome`

### 3. Déconnexion

- Suppression du token JWT
- Nettoyage de l'état d'authentification
- Retour aux écrans d'authentification

---

## Protection des Routes

### Implémentation dans `app/_layout.tsx`

```typescript
<Stack.Protected guard={state === 'authenticated'}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
</Stack.Protected>

<Stack.Protected guard={state === 'unauthenticated'}>
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
</Stack.Protected>
```

### Contexte d'Utilisation

La protection des routes est gérée par le `AuthProvider` qui :
- Vérifie l'état d'authentification
- Redirige vers l'écran de login si non authentifié
- Gère le chargement asynchrone du token

---

## Gestion du Token

### Contexte `AccessTokenProvider`

```typescript
// contexteToken.tsx
type AccessTokenContextType = {
  getToken: () => Promise<string | null | undefined>;
  setToken: (token: string | null) => Promise<void>;
  expirationAccessToken: number;   // 1h
  expirationRefreshToken: number;  // 30 jours
  resetTokens: () => Promise<void>;
};
```

Le refresh est géré dans `contexteAPI.tsx` : sur 401 (une seule tentative),
`POST {APIBaseURL}/token` avec le `refresh_token`, puis rejoue la requête
d'origine. Si le refresh échoue : suppression des tokens + `authEvents.emitUnauthorized()` → `signOut()`.

### Stockage du Token

- Le token JWT est stocké dans `expo-secure-store`
- Le token est récupéré au démarrage de l'application
- Le token est rafraîchi automatiquement si nécessaire

---

## Vérification des Permissions

### Hook `useSettings`

Dans l'écran de paramètres (`app/(tabs)/profile/settings/index.tsx`) :

```typescript
const { settings: values, hydrated, setSetting } = useSettings()
```

### Utilisation dans les Composants

```typescript
// Vérification de l'hydratation des settings
const { settings, hydrated } = useSettings()

if (!hydrated) {
  return <ActivityIndicator />
}

// Utilisation des settings
const theme = settings.theme
const language = settings.language
```

---

## Notes

- L'authentification est gérée côté client avec des tokens JWT
- Les tokens sont stockés de manière sécurisée
- La protection des routes est automatique via `Stack.Protected`
- Les permissions du système d'exploitation (camera, location, notifications) sont gérées séparément
