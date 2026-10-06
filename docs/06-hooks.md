# 📁 CATÉGORIE : HOOKS PERSONNALISÉS

## Fichiers de cette catégorie :
- `useActionFAB.tsx` - Floating Action Button actions
- `useEmailConfirmation.tsx` - Hook confirmation email
- `useFriendList.tsx` - Hook liste d'amis
- `useNavFAB.tsx` - Floating Action Button navigation
- `useTimelineLabelOffset.ts` - Hook décalage label timeline

## Hooks principaux :
1. **useNavFAB** - Navigation depuis le FAB (Floating Action Button)
2. **useActionFAB** - Actions déclenchées par le FAB
3. **useSettings** - Accès aux paramètres (langue, thème)
4. **useFont** - Vérification du chargement des fonts
5. **useEmailConfirmation** - Gestion de la confirmation par email
6. **useFriendList** - Récupération et gestion de la liste d'amis
7. **useTimelineLabelOffset** - Calcul du décalage des labels timeline

## Utilisation typique :
```typescript
// Navigation FAB
const { navigate } = useNavFAB();
navigate('eventDetails', { eventId: 'xxx' });

// Actions FAB
const { createEvent, addFriend } = useActionFAB();
createEvent(titre, description, debut, fin);

// Paramètres
const { settings, hydrated, setSetting } = useSettings();
const theme = settings.theme;
const language = settings.language;

// Fonts
const { fontsLoaded } = useFont();
if (!fontsLoaded) return <ActivityIndicator />;

// Email confirmation
const { isEmailConfirmed, confirmEmail } = useEmailConfirmation();

// Liste d'amis
const { friends, isLoading, addFriend, removeFriend } = useFriendList();

// Timeline labels
const { labelOffset } = useTimelineLabelOffset();
```

## Hooks de navigation :
- `useNavFAB` - Navigation depuis le FAB
- `useActionFAB` - Actions déclenchées par le FAB

## Hooks de données :
- `useSettings` - Accès aux paramètres utilisateur
- `useFont` - Chargement des polices
- `useEmailConfirmation` - Confirmation email
- `useFriendList` - Liste d'amis

## Hooks de calcul :
- `useTimelineLabelOffset` - Décalage des labels timeline

## Hooks de gestion :
- `useSettings` - Gestion des paramètres
- `useEmailConfirmation` - Gestion des confirmations

[Status: Command completed]
