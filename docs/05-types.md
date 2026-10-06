# 📁 CATÉGORIE : TYPES TYPESCRIPT

## Fichiers de cette catégorie :
- `availabilities.ts` - Types disponibilités (créneaux, conflits, suggestions)
- `calendar.ts` - Types événements (création, modification, suppression)
- `invites.ts` - Types invitations (liste, privilèges)
- `listener.ts` - Types listeners (événements, gestionnaires)
- `pfp.ts` - Types photos de profil (URL, placeholder)
- `settings.ts` - Types paramètres utilisateur (thème, langue, notifications)
- `url.ts` - Types URLs (validation, formats)

## Types principaux :
1. **Calendar/Event Types** - Structure des événements (id, titre, description, debut, fin, prive, regle_recurrence, participants)
2. **Invite Types** - Structure des invitations avec privilèges
3. **PFP Types** - Types pour les photos de profil avec support URLs externes
4. **Availability Types** - Types de disponibilités (créneaux libres, conflits)
5. **Settings Types** - Types de paramètres utilisateur
6. **Listener Types** - Types d'événements et gestionnaires
7. **URL Types** - Types et validation d'URLs

## Exemple d'utilisation :
```typescript
interface Event {
  id: string;
  titre: string;
  description: string;
  debut: number;
  fin: number;
  prive: boolean;
  regle_recurrence?: string;
  participants: Array<{ id: string; privilege: string }>;
}

interface Availability {
  slot: number;
  available: boolean;
  conflicts: Array<{ id: string; titre: string }>;
  suggestions?: Array<{ slot: number; priority: number }>;
}

interface Settings {
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
  notifications: {
    push: boolean;
    email: boolean;
    sound: boolean;
  };
}

interface Listener {
  type: string;
  handler: (event: any) => void;
}

interface URL {
  valid: boolean;
  scheme: string;
  host: string;
  path: string;
}
```

## Types de données :
- Événements (création, modification, suppression)
- Invitations (gestion des privilèges)
- Disponibilités (créneaux, conflits)
- Paramètres (thème, langue, notifications)
- Photos de profil (URLs, placeholders)
- URLs (validation, parsing)
- Listeners (événements, gestionnaires)

[Status: Command completed]
