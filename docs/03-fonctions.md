# 📁 CATÉGORIE : FONCTIONS UTILITAIRES

## Fichiers de cette catégorie :
- `autoRefresh.tsx` - Rafraîchissement automatique des données
- `availability.js` - Gestion des disponibilités (créneaux, conflits)
- `calculerDimensionsEvenements.js` - Calcul des dimensions des blocs d'événements
- `catcher.js` - Gestion d'erreurs unifiée (logging, toasts, rejet)
- `ceilBy5.tsx` - Arrondi au multiple de 5
- `choisirImage.tsx` - Sélection d'image (placeholder, upload, URL)
- `convertirTimestamp.js` - Conversion timestamp → date lisible
- `convertirUTCenLocal.tsx` - Conversion fuseaux horaires (UTC → Local, Local → UTC)
- `formaterDatePourServeur.js` - Formatage de dates (ISO 8601 pour l'API)
- `getNow.js` - Récupération du temps actuel (UTC, local, timestamp)
- `log.js` - Logging unifié (console, fichier, analytics)
- `ouvrirLienExterne.js` - Ouverture de liens externes (in-app, navigateur)
- `resolveMock.js` - Résolution de valeurs mock pour les tests
- `settingsStorage.ts` - Stockage des paramètres (secure store, cache)
- `timezones.ts` - Gestion des fuseaux horaires (liste, décalage, conversion)
- `tokenStore.ts` - Stockage et gestion des tokens JWT
- `traduireRecurrence.js` - Traduction des règles de récurrence

## Fonctions principales :
1. **convertUTCToLocal(utc, timezone)** - Convertir une date UTC en local
2. **convertLocalToUTC(local)** - Convertir une date locale en UTC
3. **formaterDatePourServeur(date)** - Formater pour l'API (ISO 8601)
4. **catcher(error, message)** - Gestion centralisée des erreurs
5. **getCommonFreeSlots(userEvents, friendEvents, todayDateTime)** - Calcul de disponibilités communes
6. **autoRefresh(data, interval)** - Rafraîchissement automatique des données
7. **ceilBy5(value)** - Arrondi au multiple de 5 supérieur
8. **choisirImage(type, url, placeholder)** - Sélection d'image appropriée
9. **convertirTimestamp(timestamp)** - Conversion timestamp → date lisible
10. **getNow(timezone)** - Récupération du temps actuel
11. **log(message, level)** - Logging unifié
12. **ouvrirLienExterne(url, type)** - Ouverture de lien externe
13. **resolveMock(value)** - Résolution de valeur mock
14. **settingsStorage(key, value)** - Stockage des paramètres
15. **timezones(timezone)** - Gestion des fuseaux horaires
16. **tokenStore(key, token)** - Gestion des tokens JWT
17. **traduireRecurrence(rule)** - Traduction des règles de récurrence

## Utilisation typique :
```typescript
// Conversion de date
const res = await api.request({
  method: "GET",
  url: `/evenements/${id}`,
  params: {
    debut: formaterDatePourServeur(convertLocalToUTC(start)),
    fin: formaterDatePourServeur(convertLocalToUTC(end))
  }
});

// Gestion d'erreur
try {
  await api.request(...);
} catch (error) {
  catcher(error, "Erreur lors de la requête");
}

// Rafraîchissement automatique
autoRefresh(eventData, 30000);
```

## Fonctions de conversion :
- Dates (UTC ↔ Local)
- Timestamps (Unix → Date lisible)
- Fuseaux horaires (décalage, conversion)

## Fonctions de gestion :
- Erreurs (catcher, logging)
- Stockage (settingsStorage, tokenStore)
- Navigation (ouvrirLienExterne)
- Tests (resolveMock)

## Fonctions de calcul :
- Dimensions (calculerDimensionsEvenements)
- Arrondi (ceilBy5)
- Disponibilités (getCommonFreeSlots)

## Fonctions de traduction :
- Règles de récurrence (traduireRecurrence)

[Status: Command completed]
