# 📁 CATÉGORIE : PARAMÈTRES UTILISATEUR

## Vue d'ensemble

Cette section contient tout ce qui concerne les paramètres utilisateur : stockage, récupération, mise à jour, et interface de configuration.

---

## Stockage des Paramètres

### Implémentation dans `settingsStorage.ts`

```typescript
import { asyncStorageSettingsRepository } from '@/functions/settingsStorage';

// Stockage AsyncStorage sous la clé 'settings' (pas de secure store ici)
await asyncStorageSettingsRepository.save({ theme: 210 });

// Récupération (objet partiel fusionné avec DEFAULT_SETTINGS)
const saved = await asyncStorageSettingsRepository.load();
```

### Contexte `SettingsProvider`

```typescript
// contexteSettings.tsx
type SettingsContextValue = {
  settings: AppSettings; // { language: 'en' | 'fr', timezone: string, theme: number }
  hydrated: boolean;     // useState, pas une ref
  setSetting: <K extends SettingKey>(key: K, value: AppSettings[K]) => Promise<void>;
};
```

`theme` est une **teinte HSL (number)**, pas `'light' | 'dark'`.
`setSetting` met à jour l'état, persiste en AsyncStorage, et change la locale
si `key === 'language'`. Au démarrage, la timezone `local` est résolue vers
celle de l'appareil (`getDeviceTimezone()`).

---

## Interface de Configuration

### Écran de paramètres (`app/(tabs)/profile/settings/index.tsx`)

```typescript
const { settings: values, hydrated, setSetting } = useSettings()

if (!hydrated) {
  return <ActivityIndicator />
}

// Exemples réels (settings/index.tsx) : dropdown timezone / langue,
// input numérique pour la teinte du thème, toggles de permissions OS,
// liens vers /(modals)/confirm (exportData, deleteAccount)
<SettingRow setting={{
  id: 'language',
  titleKey: 'language',
  type: 'dropdown',
  value: values.language,
  options: [
    { value: 'fr', titleKey: 'french' },
    { value: 'en', titleKey: 'english' },
  ],
  onValueChange: value => setSetting('language', value as 'en' | 'fr'),
}} />
```

### Composant `settingsRow.tsx`

```typescript
// Prend un objet Setting (union : toggle | dropdown | link | section | input),
// pas des props label/value/onPress.
type SettingRowProps = {
  setting: Setting
};

export default function SettingRow({ setting }: SettingRowProps) { ... }
```

---

## Types de Paramètres

### Paramètres réels (`types/settings.ts`)

- **theme** : `number` (teinte HSL 0-360, défaut 260 ; `DEFAULT_HUE = 274` côté palette)
- **language** : `'en' | 'fr'`
- **timezone** : `string` (ex. `'Etc/UTC'`, `'local'` résolu au démarrage)

Types d'entrées de l'écran paramètres : `toggle` | `dropdown` | `link` | `section` | `input`.

---

## Hooks Utilitaires

### `useSettings`

```typescript
const { settings, hydrated, setSetting } = useSettings();

// Utilisation
const theme = settings.theme;
const language = settings.language;
```

---

## Stockage

### `expo-secure-store`

- Stockage chiffré pour les **tokens** (`access_token`, `refresh_token`)
- Utilisé par `contexteToken.tsx` et `contexteAuth.tsx`

### `AsyncStorage`

- Stockage pour les **paramètres** (`settingsStorage.ts`, clé `'settings'`)
- Stockage pour la **teinte** (`'hue'`, via `contextePalette.tsx`)
- Persistance standard non chiffrée

---

## Notes

- Les paramètres sont stockés côté client
- Le stockage sécurisé est utilisé pour les tokens
- L'hydratation se fait au démarrage de l'application
- Les modifications sont sauvegardées immédiatement

[Status: Command completed]
