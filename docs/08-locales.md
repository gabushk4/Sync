# 08. Localisation (i18n)

## Vue d'ensemble

La localisation est gérée via la bibliothèque **i18next** avec un support pour les langues **Français (fr)** et **Anglais (en)**.

## Utilisation dans les composants

### Hook `useTranslation`

Pour utiliser la traduction dans un composant React, il faut :

1. Importer le hook `useTranslation` depuis `react-i18next`
2. Appeler le hook avec le nom du namespace (ex: `'settings'`)
3. Utiliser la fonction `t` retournée pour accéder aux clés de traduction

### Exemple concret

Dans `app/(tabs)/profile/settings/index.tsx` :

```typescript
import { useTranslation } from "react-i18next";

export default function Settings() {
    const { t } = useTranslation('settings')
    
    // Utilisation dans le JSX
    <Text>{t('timezone')}</Text>
    <Text>{t('french')}</Text>
    <Text>{t('deleteAccount')}</Text>
}
```

### Structure des clés

Les clés de traduction suivent une structure hiérarchique :

- **Clés simples** : `'timezone'`, `'french'`, `'english'`
- **Clés avec paramètres** : `'appVersion', { version: '1.0.0' }`

### Namespaces disponibles

- `settings` - Écran des paramètres (timezone, language, permissions, etc.)
- `auth` - Écran d'authentification
- `home` - Écran d'accueil
- `common` - Clés partagées entre tous les écrans

## Configuration

La configuration d'i18next se trouve dans `app.json` et `src/config/i18n.ts`.

Les langues disponibles sont définies dans `src/locales/` avec des fichiers JSON pour chaque langue.

## Best practices

- Toujours utiliser `t('key')` au lieu de chaînes de caractères statiques
- Gérer les paramètres dynamiques avec `{ param: value }`
- Prévoir des clés pour les états d'erreur et de chargement
