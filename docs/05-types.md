# 📁 CATÉGORIE : TYPES TYPESCRIPT

## Fichiers de cette catégorie :
- `availabilities.ts` - Types disponibilités (créneaux, conflits, suggestions)
- `calendar.ts` - Types événements (création, modification, suppression)
- `invites.ts` - Types invitations (liste, privilèges)
- `listener.ts` - Types listeners (événements, gestionnaires)
- `pfp.ts` - Types photos de profil (URL, placeholder)
- `settings.ts` - Types paramètres utilisateur (thème, langue, notifications)
- `url.ts` - Types URLs (validation, formats)

## Types principaux (extraits réels) :
1. **Event** (`types/calendar.ts`) - `id?`, `titre?`, `description`, `url?: UrlDescriptor`, `debut/fin: DateTime | undefined`, `prive: 0 | 1`, `privilege_membre: "lecteur" | "editeur" | null`, `regle_recurrence?`, `timezone`
2. **Friend / UserEvent / Recurrence** (`types/calendar.ts`) - `Friend { id, fp_url?, evenements: Event[] }`
3. **Participant** (`types/invites.ts`) - `id`, `fp_url`, `pseudo`, `privilege: 'editeur' | 'lecteur'`, `statut: 'en_attente' | 'acceptee' | 'refusee'`
4. **FPType** (`types/pfp.ts`) - `string | { uri, mimeType?, fileName? } | undefined` + garde `isFpObject()`
5. **UrlDescriptor** (`types/url.ts`) - Descripteur de requête `{ method, string, data }` (pas une validation d'URL)
6. **Interval / FriendIntervals / DateTimeSuggestions** (`types/availabilities.ts`) - Créneaux avec `DateTime` luxon
7. **AppSettings** (`types/settings.ts`) - `{ language: 'en' | 'fr', timezone: string, theme: number }` (`theme` = teinte HSL, pas `'light' | 'dark'`)
8. **listener.ts** - Fichier vide (aucun type défini)

## Exemple d'utilisation :
```typescript
import { Event } from '@/types/calendar';
import { AppSettings } from '@/types/settings';
import { Participant } from '@/types/invites';

const theme: number = settings.theme; // teinte HSL 0-360
const peutEditer = (p: Participant) => p.privilege === 'editeur';
```

## Types de données :
- Événements (`Event`, `Friend`, `UserEvent`, `Recurrence` — dates `DateTime` luxon, `prive: 0 | 1`)
- Invitations (`Participant` avec `privilege` et `statut`)
- Disponibilités (`Interval`, `FriendIntervals`, `DateTimeSuggestions`)
- Paramètres (`AppSettings` : langue, timezone, teinte `theme: number`)
- Photos de profil (`FPType` : URL string ou objet `{ uri, mimeType, fileName }`)
- Descripteurs de requête (`UrlDescriptor : { method, string, data }`)
- Listeners : `types/listener.ts` est vide

[Status: Command completed]
