# 📁 CATÉGORIE : PARAMÈTRES UTILISATEUR

## Vue d'ensemble

Cette section contient tout ce qui concerne les paramètres utilisateur : stockage, récupération, mise à jour, et interface de configuration.

---

## Stockage des Paramètres

### Implémentation dans `settingsStorage.ts`

```typescript
// Stockage sécurisé des paramètres
const storage = settingsStorage({
  key: 'theme',
  value: 'dark',
  secure: true
});

// Récupération des paramètres
const theme = await settingsStorage.get('theme');
const language = await settingsStorage.get('language');
```

### Contexte `SettingsProvider`

```typescript
// contexteSettings.tsx
export const SettingsProvider = ({ children }: any) => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    language: 'fr',
    notifications: {
      push: true,
      email: false,
      sound: true
    }
  });
  
  const hydrated = useRef(false);
  
  useEffect(() => {
    // Récupération depuis secure store
    loadSettings().then((saved) => {
      setSettings(saved);
      hydrated.current = true;
    });
  }, []);
  
  const setSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Sauvegarde dans secure store
  }, []);
  
  return <SettingsProviderContext.Provider value={{ settings, hydrated, setSetting }}>
    {children}
  </SettingsProviderContext.Provider>;
};
```

---

## Interface de Configuration

### Écran de paramètres (`app/(tabs)/profile/settings/index.tsx`)

```typescript
const { settings: values, hydrated, setSetting } = useSettings()

if (!hydrated) {
  return <ActivityIndicator />
}

// Liste des paramètres
<SettingsRow 
  label="Thème" 
  value={values.theme} 
  onPress={() => setSetting('theme', toggleTheme())}
/>

<SettingsRow 
  label="Langue" 
  value={values.language} 
  onPress={() => setSetting('language', toggleLanguage())}
/>
```

### Composant `settingsRow.tsx`

```typescript
interface SettingsRowProps {
  label: string;
  value: string | boolean;
  onPress?: () => void;
}

export const SettingsRow = ({ label, value, onPress }: SettingsRowProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{label}: {value}</Text>
    </TouchableOpacity>
  );
};
```

---

## Types de Paramètres

### Paramètres de base

- **theme** : 'light' | 'dark'
- **language** : 'en' | 'fr'
- **notifications** : objet avec push, email, sound

### Paramètres avancés

- **privacy** : paramètres de confidentialité
- **display** : paramètres d'affichage
- **accessibility** : paramètres d'accessibilité

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

## Stockage Sécurisé

### `expo-secure-store`

- Stockage chiffré pour les tokens et secrets
- Persistance entre les redémarrages
- Accès asynchrone

### `AsyncStorage`

- Stockage pour les paramètres non sensibles
- Plus rapide que secure store
- Persistance standard

---

## Notes

- Les paramètres sont stockés côté client
- Le stockage sécurisé est utilisé pour les tokens
- L'hydratation se fait au démarrage de l'application
- Les modifications sont sauvegardées immédiatement

[Status: Command completed]
