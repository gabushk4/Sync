# 📁 CATÉGORIE : HOOKS PERSONNALISÉS

## Fichiers de cette catégorie :
- `useActionFAB.tsx` - Floating Action Button actions
- `useEmailConfirmation.tsx` - Hook confirmation email
- `useFriendList.tsx` - Hook liste d'amis
- `useNavFAB.tsx` - Floating Action Button navigation
- `useTimelineLabelOffset.ts` - Hook décalage label timeline

## Hooks principaux (signatures réelles) :
1. **useNavFab(config: NavFabConfig)** (`hooks/useNavFAB.tsx`) - Déclare le FAB de navigation de l'écran (`{ icon, href, params }`)
2. **useActionFab({ action, icon })** (`hooks/useActionFAB.tsx`) - Déclare le FAB d'action de l'écran
3. **useFriendList(type: 'select' | 'consult')** (`hooks/useFriendList.tsx`) - Retourne une fonction : en mode `select` ajoute des `Participant` aux invités, en mode `consult` navigue vers `/(tabs)/profile/[membreId]`
4. **useEmailConfirmation()** (`hooks/useEmailConfirmation.tsx`) - Ne retourne rien actuellement (hook vide, `useFocusEffect` sans corps)
5. **useTimelineLabelOffset** (`hooks/useTimelineLabelOffset.ts`) - Calcul du décalage des labels timeline

Note : `useSettings` et `useFont` ne sont pas dans `hooks/` mais sont des hooks de contextes (`contexteSettings.tsx`, `contexteFont.tsx`).

## Utilisation typique :
```typescript
// FAB navigation (details/[eventId].tsx)
useNavFab({
  icon: <Icon name="pencil" size={24} color={colors.text} />,
  href: '/(tabs)/home/edit/[event]' as const,
  params: FABParams,
});

// FAB action (create.tsx)
useActionFab({
  action: postEvenement,
  icon: <Icon name="checkmark" color={colors.text} size={28} />,
});

// Paramètres (contexte, pas hooks/)
const { settings, hydrated, setSetting } = useSettings();
const theme: number = settings.theme; // teinte h, pas 'light'|'dark'
const language = settings.language;

// Fonts (contexte)
const { fontsLoaded } = useFont();
if (!fontsLoaded) return <ActivityIndicator />;

// Liste d'amis
const ajouterAuxInvites = useFriendList('select');
ajouterAuxInvites(friend);
const voirProfil = useFriendList('consult');
voirProfil(friend); // → /(tabs)/profile/[membreId]
```

## Hooks de navigation :
- `useNavFAB` - Navigation depuis le FAB
- `useActionFAB` - Actions déclenchées par le FAB

## Hooks de données (`hooks/`) :
- `useFriendList` - Sélection d'amis / navigation vers profil
- `useEmailConfirmation` - Confirmation email (actuellement vide)

## Hooks de contextes (dans `contextes/`, pas `hooks/`) :
- `useSettings` - Accès aux paramètres utilisateur
- `useFont` - Chargement des polices

## Hooks de calcul :
- `useTimelineLabelOffset` - Décalage des labels timeline

[Status: Command completed]
