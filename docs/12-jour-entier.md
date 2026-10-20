# 12. « Jour entier » dans la création d'un évènement

> Auteur : **Philip** — rectification pour un affichage plus conventionnel,
> liée à la user story 5 (plages sélectionnées dans le calendrier mensuel).
> Dernière mise à jour : 13/10/2026.

L'interrupteur **Jour entier** du formulaire de création (`components/datetimeSelecteurs.tsx`)
transforme l'évènement en une ou plusieurs journées complètes : de **minuit** le premier jour
à **23:59:59** le dernier jour. Les sélecteurs d'heure sont alors cachés.

---

## Comportement

| Situation | Résultat |
|---|---|
| **On active** l'interrupteur | Les heures actuelles sont gardées en mémoire, puis l'évènement couvre minuit du jour de début → 23:59:59 du jour de fin. |
| **On désactive** après l'avoir activé soi-même | Les heures gardées reviennent. |
| **On désactive** une plage venue du calendrier (activée automatiquement), ou des heures gardées déjà passées | Les **jours sont conservés**, seules des heures sont proposées : début le premier jour à l'heure suivante (jamais avant maintenant), fin le dernier jour une heure plus tard (bornée à la fin de ce jour). |
| **Plage sélectionnée dans le calendrier** (jours entiers) | Le formulaire s'ouvre avec Jour entier **déjà activé**, même si la plage commence aujourd'hui. |
| On change la **date de début** en Jour entier | Le début reste à minuit ; la fin est repoussée à la fin de ce jour si elle tombait avant. |
| On change la **date de fin** en Jour entier | La fin garde 23:59:59. |

Exemples (désactivation d'une plage du calendrier, vers 18 h) :

| Plage | Après désactivation |
|---|---|
| 15 → 17 oct. | 15 oct. 19:00 → 17 oct. 20:00 |
| Aujourd'hui → demain | aujourd'hui 19:00 → demain 20:00 |
| 16 oct. seul | 16 oct. 19:00 → 16 oct. 20:00 |

---

## Règles de validation

- **App** (`app/(tabs)/home/create.tsx`) : un évènement normal ne peut pas commencer dans le
  passé (à la minute près). Un évènement **jour entier** commence à minuit : il est accepté si
  son jour est **aujourd'hui ou plus tard** (`estJourneeEntiere`).
- **API** (`sync_api/src/functions/verifierEtFormaterDateUTC.js`, `refuserDebutPasse`) : refuse
  (400) un évènement **déjà terminé** ou commencé il y a **plus de 25 h** (un jour + un
  changement d'heure). Minuit d'aujourd'hui peut être jusqu'à ~24 h avant « maintenant » en
  UTC : la vérification à la minute près reste dans l'app.

---

## Où est le code

| Fichier | Rôle |
|---|---|
| `components/datetimeSelecteurs.tsx` | Interrupteur (`basculerJourEntier`), activation automatique pour une plage du calendrier (`allDayDetecte`), changements de date en mode jour entier (`handleStartDateChange`, `handleEndDateChange`). |
| `functions/jourCreation.ts` | `estJourneeEntiere(debut, fin)` : vrai si [debut, fin] va de minuit à la fin d'un jour ; `debutCreationPourJour(jour)` : heure proposée (heure suivante, au plus 23:00). |
| `app/(tabs)/home/create.tsx` | Garde la plage du calendrier telle quelle (`debutSuggere`) ; validation « pas dans le passé » qui accepte un jour entier d'aujourd'hui. |
| `abstractions/switchAbs.tsx` | Interrupteur de l'app : ne transmet **que** `onValueChange` (voir plus bas). |
| `sync_api/src/functions/verifierEtFormaterDateUTC.js` | `refuserDebutPasse` (règle des 25 h). |

---

## Bugs corrigés

1. **L'interrupteur ne réagissait pas.** `SwitchAbs` ne transmet que `onValueChange` au vrai
   `Switch` ; le sélecteur lui passait `onChange`, ignoré. → `onValueChange`.
2. **Les dates préremplies étaient écrasées à l'ouverture.** L'ancien `useEffect` sur
   `isAllDay` tournait aussi au montage. → Remplacé par `basculerJourEntier`, appelé seulement
   au toucher.
3. **Jour entier refusé pour aujourd'hui.** Minuit est déjà passé : l'app et l'API refusaient.
   → Règles ci-dessus.
4. **Désactiver une plage du calendrier perdait ses dates** (retour à « aujourd'hui + 1 h →
   début + 1 h »). → Les jours sont conservés, seules des heures sont proposées.
5. **Changer la date de début en mode normal remettait la fin à minuit.** → La fin est gardée
   (repoussée seulement si elle tombe avant le début).
6. **Android : toucher une date ouvrait les deux calendriers**, et celui de fin ne se refermait
   pas. → Un état par sélecteur (`showDatePicker`, `showFinDatePicker`), fermeture après choix.

---

## Comment tester

1. Calendrier → sélectionner une plage (maintenir + glisser) → « + » : Jour entier doit être
   **activé**.
2. Désactiver Jour entier : les **jours de la plage** restent, avec des heures proposées.
3. Réactiver puis désactiver : les heures choisies juste avant reviennent.
4. Créer un évènement jour entier **aujourd'hui** : accepté (201).
5. Sur Android : toucher la date de début, puis celle de fin — un seul calendrier à la fois.
