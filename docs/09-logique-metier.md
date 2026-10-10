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
  if (!values) return;

  if (values.titre && values.titre.length < 4) {
    // titre trop court : toast d'erreur, pas d'appel API
  } else {
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

    if (response.status == 201) {
      // toast de succès puis
      router.replace('/(tabs)/home');
    }
  }
  // catch : catcher(error, t('errors.createFailed')) + cas 409 (événement en conflit)
  // Envoi via le FAB : useActionFab({ action: postEvenement, icon: ... })
};
```

### 2. Récupération des Détails d'un Événement

```typescript
// app/(tabs)/home/details/[eventId].tsx
const getDetails = async (id: string) => {
  const timezone = membre.timezone;

  const res = await api.request({
    method: "GET",
    url: `/evenements/${id}`,
    params: {
      // repli si start/end absents des search params
      debut: formaterDatePourServeur(convertLocalToUTC(
        typeof start === "string" ? start : DateTime.now())),
      fin: formaterDatePourServeur(convertLocalToUTC(
        typeof end === "string" ? end : DateTime.now().plus({ hour: 1 }))),
    }
  });

  res.data.debut = convertUTCToLocal(res.data.debut, timezone);
  res.data.fin = convertUTCToLocal(res.data.fin, timezone);
  setEvent(res.data);
  // catch : router.back() + catcher(error, t('errors.loadFailed'))
};
```

### 3. Gestion des Amis et Événements

```typescript
// app/(tabs)/home/index.tsx — alimenté par AutoRefresh sur GET /evenements/amis
const modifierEvenementsAmisFetched = (data: any) => {
  const events = data.resultat ?? [];

  const amisFinal = events?.map((ami: Friend) => {
    const evenements = (ami.evenements || [])
      .map((ev: any) => {
        const start = convertUTCToLocal(ev.debut, membre.timezone);
        const end = convertUTCToLocal(ev.fin, membre.timezone);
        return {
          id: ev.id,
          url: ev.url,
          ...(ev.prive ? {} : { title: ev.titre }),
          debut: start?.toMillis(),
          fin: end?.toMillis()
        };
      })
      .sort((a, b) => a.debut - b.debut)
      // reconversion ms → DateTime luxon
      .map((ev: any) => ({
        ...ev,
        debut: DateTime.fromMillis(ev.debut),
        fin: DateTime.fromMillis(ev.fin)
      }));

    return { ...ami, evenements };
  });

  if (amisFinal.length > 0) {
    setFriends(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      amisFinal.forEach((a: Friend) => map.set(a.id, a)); // remplace les doublons
      return Array.from(map.values());
    });
  }
  // else : décrémente l'offset de pagination ; catch : setChargementEchec(true)
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

### Endpoints Principaux (observés dans le code)

- `POST /membres/inscription` - Inscription
- `POST /membres/connexion` - Connexion
- `POST /token` - Refresh de l'access token
- `GET /evenements/` - Événements de l'utilisateur (via `AutoRefresh`)
- `POST /evenements/` - Créer un événement
- `GET /evenements/{id}` - Détails d'un événement
- `PATCH /evenements/{id}` - Modifier un événement
- `POST /evenements/{id}/quitter` - Quitter un événement
- `POST /evenements/exceptions` + `PATCH /evenements/exceptions/{id}` - Exceptions de récurrence
- `GET /evenements/amis` - Événements des amis (via `AutoRefresh`)
- `POST /notifications/push_token` - Enregistrement du token push
- `DELETE /notifications/{id}` - Supprimer une notification

### Gestion des Erreurs

```typescript
import catcher from '@/functions/catcher';

catcher(error, t('errors.createFailed'))
```

Le fichier `catcher.js` centralise la gestion d'erreurs avec :
- Logging
- Toast d'erreur localisé (namespace `errors`, clé = statut HTTP)
- Ignore silencieuse du statut 304

---

## Notes

- Les conversions de fuseaux horaires se font côté client
- Les dates sont stockées en UTC et converties pour l'affichage
- Les événements récurrents sont gérés avec des règles de récurrence
