# 📁 CATÉGORIE : FONCTIONS UTILITAIRES

## Fichiers de cette catégorie :
- `autoRefresh.tsx` - Rafraîchissement automatique des données
- `availability.js` - Gestion des disponibilités (créneaux, conflits)
- `calculerDimensionsEvenements.js` - Calcul des dimensions des blocs d'événements
- `catcher.js` - Gestion d'erreurs unifiée (logging, toasts, rejet)
- `ceilBy5.tsx` - Arrondi au multiple de 5
- `couleurStatutInvitation.ts` - Couleur d'un statut d'invitation (vert / jaune / rouge) + `assombrir` — Philip, US8
- `choisirImage.tsx` - Sélection d'image (placeholder, upload, URL)
- `convertirTimestamp.js` - Conversion timestamp → date lisible
- `convertirUTCenLocal.tsx` - Conversion fuseaux horaires (UTC → Local, Local → UTC)
- `evenementsMembre.ts` - Paramètres de requête jour / plage / mois, formatage des évènements du membre, `dernierInstant` — Philip, US5
- `formaterDatePourServeur.js` - Formatage de dates (ISO 8601 pour l'API)
- `getNow.js` - Récupération du temps actuel (UTC, local, timestamp)
- `jourCreation.ts` - Règles du « + » : heure proposée, jour passé, `estJourneeEntiere` — Philip
- `log.js` - Logging unifié (console, fichier, analytics)
- `ouvrirDetailsEvenement.ts` - Ouvre les détails d'un évènement (timeline + liste du calendrier) — Philip, US5
- `ouvrirLienExterne.js` - Ouverture de liens externes (in-app, navigateur)
- `ouvrirRevueInvitation.ts` - Ouvre la revue d'une invitation / sa page de décision — Philip, US8
- `resolveMock.js` - Résolution de valeurs mock pour les tests
- `settingsStorage.ts` - Stockage des paramètres (secure store, cache)
- `timezones.ts` - Gestion des fuseaux horaires (liste, décalage, conversion)
- `tokenStore.ts` - Stockage et gestion des tokens JWT
- `traduireRecurrence.js` - Traduction des règles de récurrence
- `googleAgenda.ts` - Client de l'intégration Google Agenda (comptes, calendriers, sélection, suivi SSE de l'import)
- `googleOAuth.ts` - Flux OAuth Google côté app (obtention du code d'autorisation, PKCE)

## Fonctions principales (signatures réelles) :
1. **convertUTCToLocal(dateUTC, timezone = 'local')** - Convertir une date UTC en `DateTime` local (`functions/convertirUTCenLocal.tsx`, export nommé avec `convertLocalToUTC`)
2. **convertLocalToUTC(dateLocale)** - Convertir une date locale en UTC (même fichier)
3. **formaterDatePourServeur(dateDt)** - Formater pour l'API (`"yyyy-MM-dd HH:mm:ss"`, export default)
4. **catcher(error, titre)** - Gestion centralisée des erreurs (log + toast localisé via namespace `errors`, ignore le 304)
5. **getCommonFreeSlots(userEvents, friendEvents, date, userDndRules?, friendDndRules?, minDuration = 60)** - Calcul de disponibilités communes (`functions/availability.js`)
6. **new AutoRefresh(api, url, options?)** - Classe de rafraîchissement (options : `intervalMs`, `maxBackoffMs`, `onData`, `onPostRequest`, `onError`, `extraParams` ; méthodes `refresh/start/stop/restart/destroy/forceRefresh/setParams`)
7. **ceilBy5(d: DateTime)** - Arrondi au multiple de 5 supérieur (export default)
8. **ChooseImage(onChange)** - Sélection d'image (export default, nom avec majuscule)
9. **TraduireRecurrence(regle)** - Traduction des règles de récurrence (export default, nom avec majuscule)
10. **asyncStorageSettingsRepository { load(), save(changes) }** - Stockage des paramètres (AsyncStorage, clé `'settings'`)
11. **getToken() / setToken(token) / emptyToken()** - Gestion des tokens (`functions/tokenStore.ts`, mémoire + SecureStore via les contextes)
12. **getDeviceTimezone() / getAvailableTimezones()** - Fuseaux horaires (`functions/timezones.ts`)
13. **convertirTimestamp** - Conversion timestamp → date lisible (localisée FR/EN via `locales/*/formats.json`)
14. **getNow.js** - Fichier vide (aucune fonction exportée)
15. **log / ouvrirLienExterne / resolveMock / calculerDimensionsEvenements** - Voir fichiers sources (signatures non reprises ici)
16. **chargerConfigGoogle / chargerComptesGoogle / chargerCalendriersGoogle / selectionnerCalendriersGoogle / resynchroniserCalendrierGoogle / deconnecterCompteGoogle / connecterCompteGoogle(api, …)** - Appels API de l'intégration Google (`functions/googleAgenda.ts`)
17. **suivreImportGoogle(api, jobId, { onProgression, onFin })** - Suit un import en flux SSE, avec repli sur le polling ; retourne une fonction d'annulation (`functions/googleAgenda.ts`)
18. **extraireProgression(bloc)** - Lit les blocs `text/event-stream` reçus (testé dans `tests/googleAgenda.test.js`)
19. **demanderCodeGoogle(config)** - Lance le consentement Google et renvoie `{ code, code_verifier }`, ou `null` si l'utilisateur annule (`functions/googleOAuth.ts`)

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

// Rafraîchissement automatique (classe, pas une fonction)
import AutoRefresh from '@/functions/autoRefresh';
userEventsRefresh.current = new AutoRefresh(api, '/evenements/', {
  onData: modifierEvenementsUtilisateurFetched,
});
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
