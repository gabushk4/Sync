# 09. Logique Métier

## Vue d'ensemble

Cette section contient la logique métier de l'application, y compris les flux de données, les interactions API et le calcul des disponibilités communes.

---

## Flux de Données

### 1. Création d'un Événement

```typescript
// app/(tabs)/home/create.tsx
const postEvenement = async () => {
  const values = formRef.current?.getValues();
  
  const response = await api.post('/evenements/', {
    ...event,
    titre: values.titre,
    description: values.description,
    prive: values.prive,
    debut: formaterDatePourServeur(convertLocalToUTC(values.start)),
    fin: formaterDatePourServeur(convertLocalToUTC(values.end)),
    regle_recurrence: values.regleRecurrence,
    participants: invites.map((i) => ({ id: i.id, privilege: i.privilege }))
  });
  
  if (response.status === 201) {
    router.replace('/(tabs)/home');
  }
};
```

### 2. Récupération des Détails d'un Événement

```typescript
// app/(tabs)/home/details/[eventId].tsx
const getDetails = async (id: string) => {
  const res = await api.request({
    method: "GET",
    url: `/evenements/${id}`,
    params: {
      debut: formaterDatePourServeur(convertLocalToUTC(start)),
      fin: formaterDatePourServeur(convertLocalToUTC(end))
    }
  });
  
  res.data.debut = convertUTCToLocal(res.data.debut, timezone);
  res.data.fin = convertUTCToLocal(res.data.fin, timezone);
  setEvent(res.data);
};
```

### 3. Gestion des Amis et Événements

```typescript
// app/(tabs)/home/index.tsx
const modifierEvenementsAmisFetched = (data: any) => {
  const events = data.resultat ?? [];
  
  const amisFinal = events?.map((ami: Friend) => {
    const evenements = (ami.evenements || [])
      .map((ev: any) => ({
        id: ev.id,
        url: ev.url,
        ...(ev.prive ? {} : { title: ev.titre }),
        debut: convertUTCToLocal(ev.debut, membre.timezone)?.toMillis(),
        fin: convertUTCToLocal(ev.fin, membre.timezone)?.toMillis()
      }))
      .sort((a, b) => a.debut - b.debut);
      
    return { ...ami, evenements };
  });
  
  setFriends(prev => {
    const map = new Map(prev.map(a => [a.id, a]));
    amisFinal.forEach((a: Friend) => map.set(a.id, a));
    return Array.from(map.values());
  });
};
```

### 4. Calcul des Créneaux Libres Communs

```typescript
// app/(tabs)/home/index.tsx
import { getCommonFreeSlots } from '@/functions/availability';

{friends.map((friend) => {
  const commonFreeSlots = getCommonFreeSlots(
    userEvents,
    friend.evenements,
    todayDateTime
  );
  
  return (
    <EventsList
      owner={friend}
      commonFreeSlots={commonFreeSlots}
      events={friend.evenements}
      // ...
    />
  );
})}
```

---

## Interactions API

### Endpoints Principaux

- `GET /evenements/` - Liste des événements
- `POST /evenements/` - Créer un événement
- `GET /evenements/{id}` - Détails d'un événement
- `DELETE /evenements/{id}` - Supprimer un événement
- `POST /evenements/{id}/quitter` - Quitter un événement
- `POST /evenements/exceptions/` - Exception (annulation)
- `GET /evenements/amis` - Événements des amis
- `POST /notifications/push_token` - Enregistrement du token push

### Gestion des Erreurs

```typescript
import catcher from '@/functions/catcher';

catcher(error, t('errors.createFailed'))
```

Le fichier `catcher.js` centralise la gestion d'erreurs avec :
- Logging
- Affichage de toasts d'erreur
- Rejet approprié

---

## Notes

- Les conversions de fuseaux horaires se font côté client
- Les dates sont stockées en UTC et converties pour l'affichage
- Les événements récurrents sont gérés avec des règles de récurrence
