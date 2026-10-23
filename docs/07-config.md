# 📁 CATÉGORIE : CONFIGURATION

## Fichiers de cette catégorie :
- `app.json` - Configuration Expo Router (typedRoutes: true)
- `toastConfig.tsx` - Configuration des toasts (succès, erreur, avertissement)
- `Colors.ts` - Palette de couleurs (primaires, secondaires, neutres)
- `Radius.ts` - Rayons de bordures (buttons, cards, inputs)
- `ReanimatedConfs.tsx` - Configuration Reanimated (gestures, animations)
- `dismissButtons.ts` - Configuration des boutons de fermeture
- `settingsStorage.ts` - Configuration du stockage des paramètres

## Configuration principale :
1. **app.json** - Activation des routes typées avec Expo Router
2. **toastConfig.tsx** - Configuration des notifications toast
3. **Colors.ts** - Palette de couleurs unifiée
4. **Radius.ts** - Rayons de bordures standardisés
5. **ReanimatedConfs.tsx** - Configuration Reanimated
6. **dismissButtons.ts** - Boutons de fermeture standardisés
7. **settingsStorage.ts** - Configuration du stockage

## Endpoints API observés dans le code :
- `POST /membres/inscription` - Inscription (pseudo, mot_de_passe, courriel, fuseau_horaire)
- `POST /membres/connexion` - Connexion (pseudo, mot_de_passe → `access_token` + `refresh_token`)
- `POST /token` - Rafraîchissement de l'access token (`refresh_token`)
- `GET /evenements/` - Événements de l'utilisateur (via `AutoRefresh`)
- `POST /evenements/` - Créer un événement
- `GET /evenements/{id}` - Détails d'un événement
- `PATCH /evenements/{id}` - Modifier un événement
- `POST /evenements/{id}/quitter` - Quitter un événement
- `POST /evenements/exceptions` + `PATCH /evenements/exceptions/{id}` - Exceptions de récurrence
- `GET /evenements/amis` - Événements des amis (via `AutoRefresh`)
- `POST /notifications/push_token` - Enregistrement du token push
- `DELETE /notifications/{id}` - Supprimer une notification
- `GET /comptes/google/config` - Configuration OAuth Google publique (client_id, redirect_uri, portées)
- `GET /comptes/` - Comptes externes liés (`?fournisseur=google`)
- `POST /comptes/google/connexion` - Lien d'un compte Google (`server_auth_code` + `code_verifier`)
- `POST /comptes/deconnexion/{id}` - Déconnexion d'un compte externe
- `GET /calendriers/google` - Comptes + calendriers Google du membre
- `PUT /calendriers/google` - Sélection des calendriers (idempotent) → `202 {job_id}`
- `POST /calendriers/syncroniser/{id}` - Relance l'import d'un calendrier → `202 {job_id}`
- `GET /calendriers/imports/{id}` - Progression d'un import (repli polling)
- `GET /calendriers/imports/{id}/events` - Progression d'un import en flux SSE (`text/event-stream`)

## Configuration des couleurs :
Thème dynamique HSL : `generateTheme(hue, scheme)` (`themes/generateTheme.ts`).
Teinte par défaut `DEFAULT_HUE = 274` (`constants/Colors.ts`), modifiable par
l'utilisateur dans les paramètres (`setHue`). `Colors.ts` ne contient que des
teintes legacy (`tintColorLight: #2f95dc`).

## Configuration des rayons (`constants/Radius.ts`) :
- Petit (`sm`) : 8px
- Moyen (`md`) : 12px
- Grand (`lg`) : 16px
- Très grand (`xl`) : 20px

## Configuration Reanimated (`constants/ReanimatedConfs.tsx`) :
- `withSpringConfig = { mass: 5, damping: 100, reduceMotion: ReduceMotion.Never }`
- `withTimingConfig = { duration: 300, reduceMotion: ReduceMotion.Never }`

[Status: Command completed]
