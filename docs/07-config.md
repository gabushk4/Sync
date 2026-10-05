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

## Endpoints API principaux :
- `GET /evenements/` - Liste des événements
- `POST /evenements/` - Créer un événement
- `GET /evenements/{id}` - Détails d'un événement
- `DELETE /evenements/{id}` - Supprimer un événement
- `POST /evenements/{id}/quitter` - Quitter un événement
- `POST /evenements/exceptions/` - Exception (annulation)
- `GET /evenements/amis` - Événements des amis
- `POST /notifications/push_token` - Enregistrement du token push

## Configuration des couleurs :
- Primaire : bleu (#007AFF)
- Secondaire : vert (#34C759)
- Neutre : gris (#8E8E93)
- Fond : blanc (#FFFFFF) / noir (#1C1C1E)

## Configuration des rayons :
- Petit : 8px
- Moyen : 12px
- Grand : 16px
- Très grand : 24px

## Configuration Reanimated :
- Gestures : enabled
- Animations : smooth
- Performance : optimized

[Status: Command completed]
