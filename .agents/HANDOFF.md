# HANDOFF — Review + correction docs/ vs code (branche `gab`)

## Fait
- Lu les 14 fichiers de `docs/` en entier.
- Vérifié chaque affirmation contre le code et corrigé les `.md` :
  - `01-contextes.md` : liste complète (20 fichiers), ordre providers réel,
    `EventDraftProvider` dans `AppLoader`, 2 FAB providers distincts.
  - `02-composants.md` : inchangé (les 35 fichiers listés existent ; les
    "manquants" supposés venaient d'un listing périmé, infirmés par `ls`).
  - `03-fonctions.md` : signatures réelles (`AutoRefresh` classe,
    `ChooseImage(onChange)`, `asyncStorageSettingsRepository`, `getToken/
    setToken`, `getDeviceTimezone/getAvailableTimezones`, `getNow.js` vide,
    format serveur `"yyyy-MM-dd HH:mm:ss"`).
  - `04-routes.md` : routes manquantes ajoutées, `(modals)`/`scanQR` hors
    guards (conforme au `_layout.tsx` actuel).
  - `05-types.md` : exemples réels (`Event`, `Participant`, `FPType`,
    `UrlDescriptor`, `AppSettings.theme: number`, `listener.ts` vide).
  - `06-hooks.md` : vraies APIs (`useNavFab(config)`, `useActionFab`,
    `useFriendList(type)`, `useEmailConfirmation` vide) ; `useSettings`/
    `useFont` identifiés comme contextes.
  - `07-config.md` : couleurs HSL dynamiques, `Radius.xl = 20`, vraies
    valeurs Reanimated, endpoints observés (dont `PATCH`, pas de
    `DELETE /evenements/{id}` observé).
  - `08-locales.md` : chemins réels (`i18n.js`, `locales/`), 14 namespaces.
  - `09-logique-metier.md` : snippets alignés (validation titre, 201 lâche,
    fallbacks `DateTime.now`, étape ms→`DateTime`, endpoints réels, 304).
  - `10-authentification.md` : flux réels (`/membres/inscription` → login,
    `/membres/connexion` → `signIn`), vrai type `AccessTokenContextType`,
    refresh via `POST /token`.
  - `11-specificites-expo.md` : versions installées au lieu de "v3+",
    exemple typed-routes réel.
  - `settings.md` : réécrit (AsyncStorage vs SecureStore, `theme: number`,
    vraie `SettingRow`, vrais settings).
  - `README.md` : liens vers les 12 docs.
- Grep final : aucune affirmation fausse restante.
- Aucune modification de code applicatif (docs uniquement).

## Points marqués "(contenu non vérifié)" dans les docs
- `01` : `contexteListeOptions.js`, `contexteListesVisibles.js`, `contexteLogs.js`
- `04` : `profile/edit.tsx`, `(modals)/dataRenderer.tsx`
- Descriptions une par une des 35 composants de `02` (existence confirmée).

## Reste possible
- Lire `login.tsx`/`register.tsx` en entier (seuls des extraits ciblés ont
  été vérifiés) ; relire les 35 composants pour valider chaque description.
- Corriger l'écart `DEFAULT_SETTINGS.theme (260)` vs `DEFAULT_HUE (274)` ?
  Décision au user (hors périmètre docs).

## Bugs hors sujet
- Aucun trouvé dans ce périmètre.

---

# HANDOFF — CI GitHub Actions (10/10/2026)

## Fait
- Node figé sur 20 (`node -v` local : v20.20.1, npm 10.8.2 ; pas de
  `.nvmrc`/`engines` dans le projet).
- Deps ajoutées via `npx expo install` (versions compatibles SDK 57,
  doc officielle https://docs.expo.dev/develop/unit-testing/ et
  https://docs.expo.dev/guides/using-eslint/) :
  `eslint ^9.39.5`, `eslint-config-expo ~57.0.2`,
  `jest ~29.7.0`, `jest-expo ~57.0.5`, `@types/jest 29.5.14`.
- `eslint.config.js` (nouveau) : généré par `npx expo lint` (flat config).
- `package.json:10` : scripts `lint` (expo lint), `typecheck` (tsc --noEmit),
  `test` (jest --ci --runInBand) + bloc `jest` (preset jest-expo,
  transformIgnorePatterns doc Expo).
- `tests/availability.test.js` (nouveau) : les 3 cas de
  `tests/common_free_slot_dst.js` convertis en Jest (3/3 passent).
- `.github/workflows/ci.yml` (nouveau) : 3 jobs (lint, typecheck, test),
  `on: [push, pull_request]`, Node 20 + cache npm, `npm ci`.
- `.gitignore` : ajout de `coverage/`.
- Vérifié : YAML parsé OK, `npx jest tests/availability.test.js` 3/3 vert.

## Baseline CI = rouge (dette préexistante, non corrigée, hors périmètre)
- Lint : 100 erreurs + 197 warnings (`npm run lint`, exit 2).
  Top erreurs : `react-hooks/immutability` (52), `import/no-unresolved`
  (17), `react-hooks/rules-of-hooks` (16), `react-hooks/set-state-in-effect`
  (15). Top warnings : `no-unused-vars` (137+18), `exhaustive-deps` (47).
  Config `eslint.config.js` : bloc `globals` Jest ajouté pour les fichiers
  de test (sinon `describe/test/expect` = `no-undef`).

## CI phase 2 (10/10/2026, demande user : lint-sur-diff + Tickets.md)
- `.github/workflows/ci.yml` : job `lint` ne linte que les fichiers JS/TS
  modifiés de la PR/push (`git diff`, bloquant) ; `typecheck` en
  `continue-on-error` (informatif) ; job `test` avec quarantaine
  `--testPathIgnorePatterns "StyledText-test"` (vérifié vert : 1 suite, 3 tests).
- `Tickets.md` : T1-T12 ordonnés par priorité (T1 débloque la suite),
  copiables dans Discord, avec fichiers,
  lignes, règles et critères d'acceptation (données vérifiées eslint/tsc).
- ⚠️ NON FAIT PAR L'AGENT : `components/StyledText.tsx` et
  `components/Themed.tsx` supprimés du disque + suppression stagée,
  constaté après la session. User (10/10/2026) : suppression assumée.
  Impact vérifié : `app/modal.tsx:6`, `components/EditScreenInfo.tsx:5-6`
  importent les modules supprimés (3 erreurs tsc TS2307) → voir T2.
- Typecheck : 9 erreurs TS (`npx tsc --noEmit`, exit 2, recalculé après suppression assumée T1).
- Tests : 3/4 verts ; échec préexistant voir "Bugs hors sujet CI" plus bas.

## Reste
- Tickets T1-T12 dans `Tickets.md` (T1+T2 débloquent les jobs, T5 re-bloque
  le typecheck, T12 optionnel). Stratégie : T6 avant T7-T11 si parallèle.
- Conseil : exiger les 3 checks comme "required" dans les branch rules
  GitHub une fois la baseline reverdie.

## Bugs hors sujet CI (non corrigés, à reprendre)
- `components/__tests__/StyledText-test.js:9` : `toJSON()` rend `null`,
  aucun snapshot commité, `react-test-renderer` déprécié sous React 19.
- `abstractions/touchableOpacityAbs.tsx:23` : `fonts` introuvable + props
  JSX invalides (remonté par `tsc`, préexistant).
- `components/Themed.tsx:24,29` : indexation `ColorSchemeName`
  (`unspecified`) non couverte — obsolète, fichier supprimé (suppression
  assumée par le user, voir T1).
- `svgs/*.tsx` : prop `xmlns` rejetée par les types `react-native-svg`
  (remonté par `tsc`, préexistant).
- Note : modif `app.json` (`owner: alkemist`) déjà présente dans le
  working tree avant cette session, non touchée.

---

# HANDOFF — Exécution agent T6, T1, T2, T4 (10/10/2026)

## Fait (vérifié par relecture des diffs + runs d'exécution)
- 4 branches locales (push KO : pas de credentials GitHub dans cet env ;
  au user de pousser) : `fix/T6-dead-code` (06970c2, 54 fichiers, +56/−257),
  `fix/T1-styledtext-test` (7237b38), `fix/T2-broken-imports` (63a5a37),
  `fix/T4-svg-xmlns` (6d90c4a).
- T1 : test supprimé + quarantaine retirée ; `jest --ci` vert SANS flag
  (1 suite, 3/3 — vérifié en worktree dédié).
- T2 : `modal.tsx`, `EditScreenInfo.tsx` migrés vers RN `Text/View` +
  `useColorScheme` (light/dark recopié de l'ancien Themed) ; eslint 0 erreur
  sur les 2 fichiers ; 3 TS2307 supprimés, rien ajouté (vérifié : reste 13
  erreurs, toutes dans des fichiers non touchés). Point review : `useColorScheme`
  vient de `react-native` (pas le wrapper `./useColorScheme`) — OK pour ces
  écrans démo, à confirmer en review.
- T4 : `xmlns` (+ `xmlSpace` sur appIcon, aussi rejeté) retirés, diffs lus OK.
- T6 : 154 warnings unused → 0 (diff stat relu ; insertions = lignes
  d'import modifiées, pas de nouveau code).

## Baselines recalculées sur main (après PR #6 FAB-fix + `npm ci` frais)
- tsc : 13 erreurs (9 anciennes + 4 retombées PR #6 : `FabConfig.visible`
  ×2, `useFabActions` args ×2). Faux positif écarté : `expo-audio`
  "introuvable" venait d'un `node_modules` périmé local, résolu par `npm ci`.
- eslint brut : 138 erreurs / 285 warnings (dont 6 erreurs retombées PR #6 :
  `voiceRecorderButton` purity ×2 + refs ×3, `useActionFAB` refs ×1).
- → Nouveau ticket T13 ajouté à `Tickets.md` (retombées PR #6, bloque T5) ;
  T5 dépend désormais de T2, T3, T4, T13.

## Reste / reprise
- Pousser : `for b in fix/T6-dead-code fix/T1-styledtext-test fix/T2-broken-imports fix/T4-svg-xmlns; do git push -u origin $b; done`
  (depuis un env avec credentials), ouvrir 1 PR par branche, merger dans
  l'ordre T6 → T1 → T2 → T4.
- Tickets restants : T3, T5 (après T2+T3+T4+T13), T7-T12, T13 (neuf).
- Incident suivi : un sous-agent avait écrasé ce fichier par son rapport
  de 30 lignes ; contenu restauré depuis l'historique (aucune perte) —
  consigne : les agents APPENDENT au HANDOFF, ne le réécrivent jamais.

---

# HANDOFF — Vérification indépendante + PR descriptions (11/10/2026)
## Vérifié (worktrees /tmp, node_modules symlinké, sans toucher au working tree)
- Bases OK : les 4 branches `fix/*` partent toutes de `3df9b0a` (main = PR #6).
- T1 (`7237b38`) : `jest --ci` vert SANS flag (1 suite, 3/3) ; quarantaine
  retirée de `ci.yml:74`. tsc inchangé (14, attendu).
- T2 (`63a5a37`) : `eslint` 0 problème sur `app/modal.tsx` +
  `components/EditScreenInfo.tsx` ; tsc 14 → 11 (3 TS2307 supprimés, 0 ajouté).
- T4 (`6d90c4a`) : tsc 14 → 11 (3 TS2322 xmlns supprimés, 0 ajouté).
  `xmlSpace` aussi retiré sur `appIcon` (rejeté lui aussi, OK).
- T6 (`06970c2`, 54 fichiers) : `no-unused-vars` 154 → 0 (136 TS + 18 base) ;
  bonus `import/no-unresolved` 17 → 11 (imports incassables mais inutilisés
  supprimés) ; aucune nouvelle erreur/warning ; tsc inchangé (14).
  Spot-check `profile/index.tsx` : styles animés supprimés (`flatListWidgetsAnime`,
  `banniereImageAnime`, `photoProfilAnime`, `cameraStyle`) = définitions mortes
  (0 usage JSX sur main comme sur T6) ; `[, setFpSource]` correct (setter utilisé
  l.250-271).
## Écarts vs HANDOFF précédent (à corriger, non bloquants)
- Baseline tsc réelle = **14** erreurs, pas 13 : `components/ExternalLink.tsx:13`
  (TS2578 `Unused '@ts-expect-error'`, préexistant depuis `bef6624`, SDK plus
  strict) oublié du décompte. Reste après T2+T4 combinés = 8 (3 T3 + 4 T13 + 1
  ExternalLink) — prévoir ticket (T3-bis ou ajout à T13).
- Baseline eslint réelle = 138 erreurs / **284** warnings (pas 285).
- "Reste 13 erreurs" après T2 : en fait 11 sur la branche T2 seule (14 − 3).
## Non fait
- Push/PR GitHub : impossible depuis cet env (`gh` absent, aucun credential,
  `git ls-remote` échoue). Branches `fix/*` locales sans upstream.
  Commande : `for b in fix/T6-dead-code fix/T1-styledtext-test fix/T2-broken-imports fix/T4-svg-xmlns; do git push -u origin $b; done` puis ouvrir 4 PR
  (descriptions fournies en chat le 11/10/2026, ordre de merge T6 → T1 → T2 → T4).

---

# HANDOFF — Philip Kvaratshelya (branche `philip-dev-s1`, 10-11/10/2026) : calendrier (US5), conflits / invitations (US8), rectifications d'affichage

Branche : `philip-dev-s1` (à jour avec `origin/main` au début du travail, commit `3df9b0a`).

## Tâche en cours : changements au calendrier mensuel (vue calendrier de l'accueil)

Comportement demandé par Philip (confirmé le 2026-10-10) — code écrit, `tsc` sans
erreur dans les fichiers touchés, **pas encore testé dans l'app** (voir bundle plus bas) :
- [x] Flèche retour en haut à gauche du calendrier → timeline du jour sélectionné
      (ou du jour affiché avant d'ouvrir le calendrier si rien n'est sélectionné ;
      début de la plage si une plage est sélectionnée). `retourCalendrier` (home).
- [x] Le bouton « + » reste visible dans le calendrier (`visible: true`, déjà fait par Gabriel).
- [x] Tap sur un jour : le sélectionne et affiche ses événements dans une liste
      (ScrollView) en bas du calendrier ; ne retourne plus à la timeline.
- [x] Hold + glisser : au relâchement, la plage reste sélectionnée (n'ouvre plus la
      création). Le « + » crée l'événement sur le jour (heure suivante) / la plage
      (jours entiers) sélectionnée (`paramsCreation` dans home).
- [x] Tap sur un jour quand une plage existe : enlève la plage, sélectionne ce jour.
- [x] Tap sur un événement de la liste : ouvre ses détails (même navigation que ListItem).
- [x] Le tap dans le vide ne ferme plus le calendrier (remplacé par la flèche).

Fichiers touchés : `components/calendarMonthView.tsx`, `app/(tabs)/home/index.tsx`,
`hooks/useNavFAB.tsx`, `locales/{fr,en}/calendar.json`, `components/listItem.tsx`,
nouveau `functions/ouvrirDetailsEvenement.ts`.

### Correction (2026-10-10) : événements du jour sélectionné absents
Cause : le calendrier partageait `userEvents` (et son AutoRefresh) avec la timeline.
Au retour d'un autre écran (ex. détails d'un événement ouverts depuis la liste),
l'effet de focus de l'accueil recrée le rafraîchissement **du jour courant**, ce qui
remplaçait les événements du mois → le 4 octobre paraissait vide jusqu'au changement
de mois. Vérifié avec l'API (le mois d'octobre renvoie bien les 2 événements du 4).
Correction : le calendrier a sa propre liste `evenementsMois` et son propre
AutoRefresh (effet de focus dépendant de `vueCalendrier` / `moisCalendrier`), recréé
au retour d'un écran ; la timeline n'est plus basculée jour ↔ mois.
`formaterEvenementsMembre` (pure) est partagée par les deux.

### Calendrier = page séparée (2026-10-10)
- Nouvelle page `app/(tabs)/home/calendrier.tsx` (Stack de l'accueil, en-tête natif
  « Calendrier » + flèche native, choix de Philip). Elle contient la sélection (jour /
  plage), son propre AutoRefresh du mois et son « + » (`useNavFab('calendrier', …)`).
  Ouverte par le bouton date (icône calendrier) de l'accueil, avec `jour` en paramètre.
- Retour (flèche, glisser iOS, bouton Android) : la page enregistre le jour sélectionné
  dans `events/calendrierEvents.ts` ; l'effet de focus de l'accueil le consomme et affiche
  la timeline sur ce jour (sinon aujourd'hui, comme avant).
- La flèche ← ajoutée dans `CalendarMonthView` a été retirée (remplacée par l'en-tête).
- Fonctions partagées déplacées dans `functions/evenementsMembre.ts` : `paramsPlage`,
  `paramsJour`, `paramsMois`, `LIMITE_MOIS`, `formaterEvenementsMembre`.
- L'accueil ne contient plus aucun état du calendrier (`vueCalendrier`, etc.).
- `pathname: '/(tabs)/home/calendrier' as any` dans l'accueil : les types de routes
  d'expo-router se régénèrent au prochain `npx expo start`, le `as any` pourra partir.

### Optimisations / réutilisation (2026-10-10)
- Ouverture du calendrier (« sleep » ressenti) : pas de pause dans le code, mais la
  `FlatList` des mois rendait 21 pages (~900 cases) → `windowSize={3}`,
  `initialNumToRender={1}`, `maxToRenderPerBatch={1}` ; et la grille attendait la mesure
  `onLayout` → largeur estimée depuis la fenêtre au premier rendu (recalée ensuite).
- Points des jours : `Set` + `.has` au lieu d'un tableau parcouru pour chaque case.
- Navigation vers les détails partagée (`ouvrirDetailsEvenement`) par la timeline
  (ListItem) et la liste du calendrier.

### Hold + glisser, boîte animée, événements perdus après un swipe (2026-10-10)
- Événement du 4 oct. disparu après oct → nov → oct : le mois était synchronisé sur
  `onScrollEndDrag` (offset au lâcher du doigt, pas la page finale) → un swipe court
  changeait le mois affiché sans prévenir le parent. Maintenant `onMomentumScrollEnd`
  (+ `onScrollEndDrag` seulement si déjà aligné), et `onChangeMonth` reçoit le mois
  absolu (plus de cumul ±1). Garde `actif` dans `calendrier.tsx` contre une réponse
  tardive d'un ancien mois (`destroy()` n'annule pas la requête en cours).
- Hold : le PanResponder + `measureInWindow` (mesuré pendant l'animation d'entrée de la
  page) remplacé par un `Gesture.Pan().activateAfterLongPress(300)` (RNGH), coordonnées
  relatives à la grille, haptique au début et à chaque jour.
- Plage affichée par une boîte (un segment animé `SegmentPlage` par rangée de semaine,
  `withSpring`) qui grandit avec le doigt et reste après le relâchement.
- Pas encore testé sur appareil.

### Liste par jour + conflit multi-évènements (2026-10-10)
- Liste sous le calendrier : une section par jour (date, compteur, puis ses évènements ;
  un évènement de plusieurs jours apparaît sous chaque jour avec « Jour n sur N »).
  Plus de titre « date – date » pour une plage. Cartes : colonne heures, titre,
  description, icônes récurrence / privé.
- **API (`sync_api`, branche `philip_dev`)** : `verifierDisponibilite` collecte TOUS les
  chevauchements ; `retourConflit` renvoie `evenements` (tous, triés) + `evenement` (le
  1er, compatibilité). `trouverChevauchement` renvoie maintenant un tableau. Les
  exceptions sont aussi appliquées pour un nouvel évènement récurrent. → redémarrer /
  redéployer l'API. (`routes/disponibilites.js` appelle `trouverChevauchement` avec une
  autre signature et du `knex` : déjà cassé avant, non touché.)
- Modale `conflitEvenement` : liste à cocher de tous les évènements en conflit (tous
  cochés), « Retirer n évènements et créer », « Modifier mon horaire », « Ne pas créer ».
  Si des conflits restent après la création, la liste est remplacée par ceux-ci.

### Pas d'évènement dans le passé (2026-10-10)
- `FabConfig.bloque` (message) : le FAB affiche ce message en toast au lieu de naviguer.
  Utilisé par le calendrier (jour / plage qui commence avant aujourd'hui) et l'accueil
  (jour affiché avant aujourd'hui).
- `create.tsx` : le minimum n'est plus jamais dans le passé (une plage qui commence plus
  tôt aujourd'hui démarre à maintenant) ; validation à l'envoi (`create.pastStart`).
- API : middleware `refuserDebutPasse` sur POST /evenements (400, marge 5 min). Vérifié en
  local : passé → 400, futur → 201 (évènements de test supprimés).

### Toasts bloqués + titre requis (2026-10-10)
- `ToastAbs` : la file attendait le `onHide` du toast affiché ; un toast montré par le
  `<Toast/>` de `(modals)/_layout` (modale de conflit) fermé avant la fin ne l'appelait
  jamais → tous les toasts suivants restaient en file (ex. « doit avoir un nom » après
  une création multi-jours). Ajout d'un minuteur de secours, et un toast persistant
  (`autoHide: false`) est remplacé au lieu de bloquer la file.
- `toastErreur` : `minHeight` au lieu d'une hauteur fixe (le texte long débordait).
- Titre vide vérifié avant tout dans `create.tsx` (`create.titleRequired`) et dans l'API
  (`exigerTitre`, avant `verifierDisponibilite`).

### Revue calendrier + conflit (2026-10-10)
Corrigé : événements gardés par mois (`evenementsParMois`) et grille complète chargée
(`paramsMois` couvre les semaines de bord) ; memo `semainesActuel` sur l'index ; points
et liste avec la même règle (fin à minuit) ; conflit : arrêt si un retrait échoue ;
`dismissTo('/(tabs)/home')` au lieu de `replace` (créait un 2e accueil par-dessus le
calendrier) ; titre en double retiré de la route POST (API).
Non corrigé (noté) :
- Conflit sur une occurrence modifiée (`type: 'exception'`) : `retirerExistant` fait un
  DELETE /evenements/<id> avec l'id de l'exception (probablement 404).
- API `verifierDisponibilite` : pour un NOUVEL évènement récurrent, la fenêtre ne couvre
  que le jour de la 1re occurrence → les occurrences suivantes ne sont pas vérifiées.
- `home/index.tsx` : code mort déjà présent sur `main` (`getEventDateRangeParams`,
  `chargerEvenementsEvent`, `currentTime`, `chargementEchec`, `afficherRetour`, …).

### Revue finale + DRY + commentaires (2026-10-11)
- Nouvelles fonctions partagées : `functions/jourCreation.ts` (`debutCreationPourJour`,
  `estJourPasse` — accueil + calendrier), `dernierInstant` dans `evenementsMembre.ts`
  (points / liste / libellés du calendrier), `conflitsDeLaReponse` dans `types/conflit.ts`
  (création + modale de conflit).
- Retirés : `getEventDateRangeParams` (mort, doublon de `paramsJour`) et le paramètre
  `existant` de la modale de conflit (plus envoyé).
- Commentaires JSDoc avec `@author Philip Kvaratshelya — user story 5` (calendrier),
  `— user story 8` (conflit, app + API) et `— rectification for a more conventional
  display` (accueil, toasts, FAB, dispo communes, validations, API titre / date passée).
- Vérifié : `tsc` (aucune nouvelle erreur), API locale (201 / 400 titre / 400 passé /
  409 avec `evenements`). Jest non lancé : preset `jest-expo` absent de node_modules.

### « Modifier mon horaire » → calendrier tel qu'avant le « + » (2026-10-11)
- 4 essais ratés en naviguant depuis la route `(modals)/conflitEvenement` (autre pile
  que la création) : deux back(), fermeture au focus, dismissTo (empilait un nouveau
  calendrier), navigation de la création via un registre.
- Solution finale : l'écran de conflit n'est plus une route. C'est le composant
  `components/conflitEvenement.tsx`, affiché par `create.tsx` dans un `Modal` RN
  transparent (avec son propre `<Toast/>`). Il appelle `onSortie('formulaire' | 'retour'
  | 'accueil')` ; `create.tsx` le ferme puis fait `navigation.goBack()` (retour au
  calendrier tel quel, ou à la timeline) ou `dispatch({ type: 'POP_TO_TOP' })`.
  Supprimés : `app/(modals)/conflitEvenement.tsx`, `events/conflitEvents.ts`.
- À tester sur appareil.

### Vue horaire mise à jour dès la sélection dans le calendrier (2026-10-11)
- `calendrierEvents` est devenu un émetteur (`definirJour` / `abonner`) : chaque
  sélection (jour, ou 1er jour d'une plage) est appliquée tout de suite par l'accueil
  (`appliquerJourCalendrier`), encore caché sous le calendrier, avec préchargement du
  jour choisi (`prechargerJours(jour, true)`). Au retour, la timeline est déjà sur ce
  jour (avant : changement visible pendant la transition). L'ancien `consommerJour`
  est retiré ; le focus de l'accueil garde simplement le jour affiché.

### « Jour entier » dans la création (2026-10-11)
- `datetimeSelecteurs.tsx` : l'effet sur `isAllDay` (qui tournait aussi au montage)
  remplacé par `basculerJourEntier` ; activé tout seul pour des jours entiers pré-remplis
  (plage du calendrier) ; changement de date en jour entier garde minuit → 23:59:59 ;
  fin conservée au changement de date de début (elle retombait à minuit) ; Android :
  sélecteur de date de fin séparé (les deux dialogues s'ouvraient) et refermé.
- `estJourneeEntiere` (jourCreation.ts) ; `create.tsx` accepte un jour entier commençant
  aujourd'hui et garde la plage telle quelle.
- API `refuserDebutPasse` : refuse si la fin est passée ou le début > 25 h dans le passé
  (un jour entier d'aujourd'hui commence à minuit local). Vérifié en local (201 / 400).

### Onglet « sync » depuis le calendrier (2026-10-11)
- `app/(tabs)/_layout.tsx` : l'onglet home avait `href: "/(tabs)/home"` → bouton-lien
  qui ouvrait une NOUVELLE timeline (sur aujourd'hui) par-dessus le calendrier. `href`
  retiré pour home + écouteur `tabPress` : si la pile home a plus d'un écran,
  `POP_TO_TOP` sur cette pile → timeline existante, déjà sur la date du calendrier.
- Corrigé aussi : « Jour entier » ne basculait jamais — `SwitchAbs` ne transmet que
  `onValueChange` (le `onChange` passé était ignoré).

### Invitations : conflits à l'acceptation, revue des horaires, page de décision (2026-10-11)
- **API (`sync_api`)** :
  - `verifierDisponibilite.js` : logique extraite dans `trouverConflits(...)` (partagée) ;
    seuls les évènements créés par le membre ou ACCEPTÉS comptent (plus les invitations
    en attente / refusées).
  - `creerEvenement.js` (nouveau) : insertion + créateur + invitations (POST /evenements).
    `invite.js` : heures en `HH:mm`.
  - `PATCH /evenements/invitations/:id` (acceptee) : vérifie l'horaire de l'invité → 409.
  - `POST /evenements/:id/participants` : `exigerParticipantAccepte` (403 sinon).
  - `GET /evenements/invitations/:id/horaires?debut&fin` (réservé à l'invité) →
    `{ evenement, leader, invites, moi }` + évènement invité avec `statut_invitation`.
  - Testé en local : 409 à l'acceptation avec conflit, 200 sans conflit, 403
    non-participant, horaires 200 (invité) / 404 (autre). Données de test supprimées.
- **App** :
  - `components/conflitEvenement.tsx` : props `evenement`, `confirmer`, `mode`
    ('creation' | 'invitation').
  - `hooks/useDecisionInvitation.tsx` : accepter (409 → fenêtre de conflit : retirer et
    accepter / modifier mon horaire → revue) et refuser ; utilisé par le fil
    (`notificationItem.tsx`) et la page de décision.
  - `app/(tabs)/home/revueInvitation.tsx` : organisateur (⭐) / invités / moi, évènement
    invité vert / jaune / rouge selon le statut, seul celui de l'organisateur est
    touchable → page de décision (`details/[eventId]` avec `invitation` : lecture seule,
    `components/panneauDecisionInvitation.tsx` : participants dépliables + Accepter /
    Refuser).
  - `Event.couleur` / `Event.cliquable`, `ListItem onPress`, `EventsList
    onPressEvenement` / `defilerMaintenant`.
- **Contre-proposition retirée à la demande de Philip** (route, migration annulée en local
  avec `migrate:down` puis supprimée, bouton, paramètres de création, statut, textes).
- Pas encore testé sur appareil.

### Revue d'intégrité invitations (2026-10-11)
- DRY : `functions/couleurStatutInvitation.ts` (revue + panneau), `bornesLocales` dans
  `types/invitation.ts`, `useDecisionInvitation` : accepter / refuser → `repondre(statut)`,
  `ouvrirDecisionInvitation` partagé (fil + revue). Confirmation « Attention » avant de
  retirer des conflits. JSDoc `@author Philip Kvaratshelya — user story 8` partout.
- Retestés en local : 409 / 200 à l'acceptation, 403 non-participant, horaires 200 / 404,
  création 201.

### Chargements / spinners (2026-10-11)
- `Spinner` commun (user story 12) au lieu d'`ActivityIndicator` dans mes écrans (accueil,
  revue, panneau de décision, conflit).
- Plus de spinner infini en cas d'erreur : revue (bouton « réessayer »), participants du
  panneau, mois du calendrier, rangée du membre sur l'accueil.
- Réponse à une invitation : spinner sur le bouton envoyé, boutons désactivés, plus de
  double envoi (fil ✓/✗ et page de décision ; le refus du fil passe aussi par le hook).
- Création : verrou `envoiEnCoursRef` (un double appui créait l'évènement 2 fois) +
  spinner pendant l'envoi.
- Calendrier : spinner au lieu de « Aucun évènement » pendant le chargement du mois.

### Invitations envoyées seulement à la création (2026-10-11)
- App : déjà le cas (participants gardés en local pendant la création, envoyés avec
  `POST /evenements`). Sécurisé : `participantsListe.tsx` ne passe `inviterUrl` que pour
  un évènement existant ; `eventListAmi.tsx` ignore un paramètre « undefined ».
- API : les pushs d'invitation partaient AVANT le commit. `envoyerNotification(...,
  { pushsDifferes })` les met en file ; `envoyerPushsDifferes(pool, pushs)` les envoie
  après le commit (POST /evenements et POST /:id/participants).
- Testé en local : création en conflit → 409 et 0 invitation ; création libre → 201,
  1 invitation + notification.

### Revue : amis vs non-amis (2026-10-11)
- API horaires : `resoudreAmitie` → chaque personne a `ami` ; évènements d'un ami comme
  les rangées d'amis (titre caché seulement si privé), d'un non-ami `masque: true` sans
  titre ni description.
- App (`revueInvitation.tsx`) : `masque` → bloc gris (`colors.muted`) libellé « Privé ».
- Testé en local pour un ami (titre visible). Cas non-ami pas testé (pas de 3e compte).

### Revue : dispo communes, vert foncé, mon évènement touchable (2026-10-11)
- Rangées d'amis : `getCommonFreeSlots(mes occupations, les siennes, jour)` (une
  invitation non acceptée ne compte pas comme occupée).
- Évènement invité de l'organisateur : `assombrir(colors.success)` (nouveau, dans
  `couleurStatutInvitation.ts`, pour les couleurs `hsl(...)` de la palette).
- L'évènement invité dans MA rangée est aussi touchable → page de décision.

### Mot de passe oublié + journal des erreurs (2026-10-11)
- App : le bouton « mot de passe oublié » de `login.tsx` ne faisait qu'un log.
  `components/motDePasseOublie.tsx`, affiché dans `ModalBase` par la route
  `app/(auth)/mdpOublie.tsx` (transparentModal dans (auth) : les routes (modals) exigent
  d'être connecté ; 2026-10-13, avant c'était un Modal RN) → `POST /recuperation/demande` (API user story 14 déjà prête), spinner,
  erreur affichée dans la fenêtre, toast de succès. Textes `forgot.*` dans `auth.json`.
  Testé : courriel inconnu → 400 « Adresse courriel introuvable ». Envoi réel pas testé
  (pour ne pas envoyer de courriel).
- API : `logErreurRequete(req, res, titre, err)` ajouté à `logErreur.js` (entrée avec la
  trace + marque la requête pour éviter le doublon de `journaliserReponses5xx`). Utilisé
  dans les catch de : création, vérification participant, ajout de participants,
  réponse à une invitation, horaires d'invitation, `verifierDisponibilite`.
- À signaler (US 14, pas modifié) : `/recuperation/demande` dit si un courriel existe ou
  non (énumération de comptes).

## Bugs trouvés hors sujet (non corrigés)
- `hooks/useNavFAB.tsx` : `configRef = useRef(config)` n'est jamais mis à jour, donc le
  FAB garde les `params` du premier rendu. **Corrigé quand même** : nécessaire pour que
  le « + » reçoive le jour / la plage sélectionnée (dans le sujet de la tâche).
- `sync_api/src/functions/envoyerEmail.js` : `throw EmailError` (lance la classe, pas
  une instance) au lieu de `throw new EmailError(...)`.
- `sync_api/src/routes/evenements.js` (route DELETE d'une exception) : `DELETE FROM
  exceptions` alors que la table s'appelle `evenements_exceptions`.

- **CORRIGÉ (accord de Philip, 2026-10-10)** — bloquant, déjà présent sur `origin/main` :
  l'app ne compilait plus. `app/modal.tsx` (écran de démo du modèle Expo, ouvert nulle
  part) → `components/EditScreenInfo.tsx` importait `./Themed` et `./StyledText`,
  supprimés par Gabriel dans `c90aa48`. Les deux fichiers ont été retirés (`git rm`) ;
  le bundle Android et iOS compile de nouveau. À signaler à Gabriel : `main` est cassé.
- **Déjà présent sur `origin/main`** (FAB-fix de Gabriel, nouvelles signatures
  `useNavFab(owner, config)` / `useActionFab(owner, { action, config })`) :
  - `app/(tabs)/profile/edit.tsx:62` et `app/(tabs)/home/edit/[event].tsx:161` :
    `useActionFab({...})` avec l'ancienne signature (1 argument) → le bouton
    « enregistrer » de ces écrans ne marche probablement pas.
  - `app/(tabs)/home/details/[eventId].tsx:172` et `app/(tabs)/inbox/index.tsx:51` :
    config de FAB sans `visible` (erreur de type `FabConfig`).

## Ce qui reste / suivi
- Tester les changements du calendrier dans l'app (le bundle compile maintenant).
- Rien n'est commité ni poussé sur `philip-dev-s1`.

## État final (11/10/2026) — Philip Kvaratshelya
- Tout est commité sur `philip-dev-s1` (app) et `philip_dev` (API), `origin/main` fusionné
  dans les deux, PR ouvertes vers `main` pour revue du superviseur.
- Vérifié : `tsc` → seules les erreurs préexistantes (T3, T4, T13 sauf `details/[eventId]`
  corrigé ici) ; T2 réglé (suppression d'`app/modal.tsx` et `components/EditScreenInfo.tsx`).
  ESLint sur les fichiers modifiés → seules les erreurs préexistantes suivies par T8
  (`notificationItem.tsx`) et T11 (`home/index.tsx` ×7, `participantsListe.tsx` ×1).
  Jest : `tests/availability.test.js` 3/3 (StyledText-test = T1, ignoré par la CI).
  API testée en local (création, conflits, invitations, horaires, mot de passe oublié).
- Reste : tests sur appareil ; migration d'un coéquipier en attente
  (`20260928000000_conversations_couverture_optionnelle.js`) ; bugs hors sujet listés
  plus haut (exceptions récurrentes, fenêtre récurrente de `verifierDisponibilite`,
  énumération de comptes sur `/recuperation/demande`, erreurs de l'app non journalisées).

## « Jour entier » : dates d'une plage du calendrier conservées (13/10/2026) — Philip Kvaratshelya
- `components/datetimeSelecteurs.tsx` (`basculerJourEntier`) : désactiver Jour entier sur une
  plage du calendrier gardait « aujourd'hui + 1 h → début + 1 h » ; les jours sont maintenant
  conservés (début = 1er jour à l'heure suivante, fin = dernier jour une heure plus tard).
- `create.tsx` : retrait de `useRouter` / `useAccessToken` utilisés sans import (reste de la
  fusion `fix/T6-dead-code` dans `main` → la création plantait).
- Doc : `docs/12-jour-entier.md` (lien dans `docs/README.md`).
- Bug hors sujet noté (non corrigé, T13) : `app/(tabs)/home/edit/[event].tsx:161` appelle
  `useActionFab` avec l'ancienne signature → l'écran de modification devrait planter.

---

# HANDOFF — Écran Google Agenda (21/10/2026)

Branche : `US-18` (les 2 repos `sync` et `sync_api` sont sur `US-18`).

## Contexte determinations (à lire avant de coder)
- Le client OAuth Google configuré dans `sync_api/.env` (`219177665566-…apps.googleusercontent.com`)
  est de type **WEB** : l'authorization endpoint répond
  `Custom scheme URIs are not allowed for 'WEB' client type` pour tout schéma personnalisé,
  et `redirect_uri_mismatch` pour les URI https testées (`auth.expo.io`, `dev.syncalkemy.ca`…).
  → pour que l'app obtienne un code, il faut un client **Android/iOS/Desktop** acceptant
  `sync://oauth2redirect` (cf. `GOOGLE_REDIRECT_URI` dans `sync_api/.env`).
- `expo-auth-session` v57 n'a plus de proxy `auth.expo.io` câblé (`getStartUrl` n'est appelé
  nulle part) → pas de repli https possible depuis l'app.
- `makeClient()` envoyait `redirect_uri=` **vide** ; Google l'acceptait (l'erreur remontait
  ensuite sur le code), mais `getToken(code, options)` ignore le 2e argument (c'est le
  callback) : il faut passer un **objet** d'options pour fournir `redirect_uri` + `code_verifier`.

## App (`sync`)
- `functions/googleAgenda.ts` (nouveau) : client API de l'intégration Google —
  `chargerConfigGoogle`, `chargerComptesGoogle`, `chargerCalendriersGoogle`,
  `selectionnerCalendriersGoogle`, `resynchroniserCalendrierGoogle`, `deconnecterCompteGoogle`,
  `connecterCompteGoogle`, `suivreImportGoogle` (SSE + repli polling), `extraireProgression`.
  ⚠️ RN n'expose pas `Response.body` (le polyfill de `fetch` passe par XHR) → le flux SSE est
  lu via `xhr.responseText` dans `onprogress`, en ne traitant que les blocs terminés par `\n\n`.
- `functions/googleOAuth.ts` (nouveau) : `demanderCodeGoogle(config)` — `expo-auth-session`
  (`loadAsync` + `promptAsync`), PKCE par défaut, `access_type=offline` + `prompt=consent`
  (sans ça Google ne renvoie pas de refresh_token). Renvoie `{ code, code_verifier }`.
- `app/(tabs)/profile/settings/calendars/google.tsx` : écran complet — comptes liés
  (statut, « accès révoqué », déconnexion), connexion OAuth, liste des calendriers
  (sélection, calendrier principal, déjà lié à un autre compte), enregistrement de la
  sélection, resynchronisation d'un calendrier, progression de l'import en direct.
- `locales/{fr,en}/calendar.json` : section `google` (31 clés, same in both languages).
- `package.json` : `moduleNameMapper` `^@/(.*)$` ajouté au bloc `jest` (les modules de
  `functions/` importent via l'alias `@/`).
- `tests/googleAgenda.test.js` (nouveau) : 5 tests sur le parseur SSE.
- Docs : `docs/03-fonctions.md` (2 entrées + 4 signatures), `docs/07-config.md` (9 endpoints).

## API (`sync_api`)
- `GET /comptes/google/config` (nouveau, public) : `client_id`, `redirect_uri`, `scopes`.
- `GET /comptes/` : **réparé** (la version en cours de travail visait la table `comptes` au
  lieu de `comptes_externes`, `pool.query()` sans argument, JSON tronqué, et une injection
  SQL sur `fournisseur`). Retourne maintenant `{ comptes: [...] }` + `a_reconnecter`.
- `POST /comptes/google/connexion` : échange du code via `exchangeCode` (redirect_uri + PKCE),
  **upsert** du compte (avant : INSERT → violation de la contrainte unique en reconnexion),
  conservation du refresh_token existant si Google n'en renvoie pas.
- `POST /comptes/deconnexion/:idPublique` : **implémenté** — calendriers désactivés,
  événements supprimés en douceur (`deleted_at`), jeton neutralisé (la colonne est NOT NULL).
- `PUT /calendriers/google` : **corrigé** — le jeton était pris du *premier* compte du membre
  (le calendrier pouvait être d'un autre compte) et l'INSERT ne renseignait pas `id_compte`
  (le calendrier n'était rattaché à aucun compte). Résolution par calendrier, `id_compte`
  renseigné, `compte_origine` = le compte (et non l'id du calendrier), `label` du job.
- `POST /calendriers/syncroniser/:idPublique` : **implémenté** (resync d'un calendrier).
- `POST /calendriers/activer|desactiver` : 501 explicite (le PUT est idempotent et fait foi) —
  avant, ces stubs ne répondaient jamais et laissaient la requête en suspens.
- `src/jobs/events_imports.js` : `label` dans le snapshot du job (progression par calendrier).
- `src/functions/google.js` : `scopes`, `exchangeCode(code, codeVerifier)`, `makeClient()`
  avec le vrai `redirect_uri`.
- `src/config/env.js` : `googleRedirectUri` (nouvelle var d'env `GOOGLE_REDIRECT_URI`).

## Vérifications
- API testée en local (MySQL docker :3307, API :3100) : `GET /comptes` (200),
  `GET /comptes/?fournisseur=google` (200), `GET /calendriers/google` (200),
  `POST /comptes/google/connexion` sans code (400), `POST /comptes/deconnexion/:id` (200 :
  compte `deconnecte`, calendrier `actif=0`, 3 événements en `deleted_at`),
  `PUT /calendriers/google` sans compte (409) / sélection invalide (400),
  `POST /calendriers/syncroniser/:id` inconnu (404), `activer|desactiver` (501).
- Chemin « jeton révoqué » : jeton factice → Google `invalid_grant` → compte marqué
  `erreur` + `a_reconnecter: true` → l'app affiche « reconnectez ce compte ».
- App : `tsc` → 5 erreurs, **exactement les 5 préexistantes** (T3 + T13), aucune nouvelle ;
  `eslint` → 0 erreur sur les 4 fichiers touchés ; `jest` → 8/8 (2 suites) ;
  `npx expo export -p android` → exit 0 (les fichiers de route vides `file.tsx` /
  `system.tsx` / `outlook.tsx` ne cassent pas le build).

## Reste / à faire
- **Console Google** : créer un client Android/iOS/Desktop, y enregistrer
  `sync://oauth2redirect`, et mettre son `client_id`/`client_secret` dans `sync_api/.env`
  (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET`). Tant que le client WEB actuel est
  utilisé, Google refuse le schéma personnalisé → la connexion OAuth ne peut pas aboutir.
- **Non testé sur appareil** : le flux OAuth (consentement, retour, échange du code) et le
  suivi SSE en conditions réelles.
- `sync_api` : le TODO `TODO_IMPORT_SYNCHRONISATION.md` n'est pas à jour (voir le commit
  correspondant) ; l'état des jobs reste en RAM (pas de table de jobs), pas de
  synchronisation incrémentale (`sync_token` jamais écrit).
- Non fait (hors périmètre choisi) : `file.tsx` / `system.tsx` (import .ics et calendriers
  système) restent vides ; `outlook.tsx` reste vide.

## Bugs hors sujet (notés, non corrigés)
- `sync_api/src/routes/evenements.js` : `DELETE /evenements/exceptions/:id` cible la table
  `exceptions` alors que la table s'appelle `evenements_exceptions` (déjà signalé).
- `sync_api/src/functions/google.js` : `importCalendar` stocke l'id Google brut dans
  `evenements.uuid_externe` (varchar 64) alors que l'import .ics y met un sha256 ; un id
  Google long tronquerait l'insertion.
- `sync_api/src/routes/calendriers.js` (`GET /google`) : le `commit()` est appelé même
  quand aucune transaction n'a été ouverte (sans conséquence avec MySQL, mais trompeur).

### Complément (21/10/2026) — contrat d'erreur affine
- `PUT /calendriers/google` distingue maintenant les deux cas de 409 :
  `409 {message:'aucun compte Google lié'}` (aucun compte du tout) vs
  `409 {message:'compte Google à reconnecter', code:'google_reauth'}` (compte existant
  mais jeton invalide). L'app affiche un toast « reconnectez ce compte » sur `google_reauth`.
- Contrat rejoué contre l'API locale (`tests` manuels, `/tmp/opencode/contrat_app.js`) :
  `GET /comptes/google/config`, `GET /comptes/`, `GET /calendriers/google`,
  `PUT /calendriers/google` (409 `google_reauth` avec un jeton factice) et
  `POST /comptes/deconnexion/:id` → toutes les formes de réponse correspondent aux types
  TypeScript de `functions/googleAgenda.ts`. Le `400 'calendrier inconnu'` n'est atteignable
  qu'avec un vrai jeton Google (non testé ici).

### Complément (21/10/2026) — désactivation d'un calendrier = suppression douce
Décision user : « quand on désactive un calendrier, on ne doit pas supprimer les
événements, mais mettre un `deleted_at` ».

**API (`sync_api`)**
- `PUT /calendriers/google` : la désactivation ne fait plus
  `DELETE FROM calendriers` (qui déclenchait le `ON DELETE CASCADE` sur
  `evenements.calendrier_id` → suppression physique). Elle fait désormais :
  `UPDATE evenements SET deleted_at = NOW() WHERE calendrier_id IN (...)` puis
  `UPDATE calendriers SET actif = 0`. Le calendrier est **conservé** (désactivé),
  il pourra être réactivé et réimporté plus tard.
- `GET /calendriers/google` (prune : calendrier disparu de Google) : même traitement
  (suppression douce + `actif = 0`), plus la transaction qui était ouverte/fermée
  incohéremment (`commit()` appelé même sans `beginTransaction()`).
- `PUT /calendriers/google` restructuré : **Google n'est plus contacté que pour les
  calendriers *nouveaux***. Conséquence : le membre peut **retirer** un calendrier
  même si son accès Google a été révoqué (sinon il était coincé avec des
  calendriers qu'il ne pouvait plus enlever). La réactivation, elle, exige un compte
  `actif` → `409 {code:'google_reauth'}`.
- `PUT /calendriers/google` renvoie `calendriers_desactives` (nombre de calendriers
  retirés) en plus de `job_id`.
- `verifierAccesEvenement` (`src/functions/authenticate.js`) et
  `GET /evenements/:idevenement` filtrent désormais `deleted_at IS NULL` : un
  événement en suppression douce n'est plus accessible par son id (403).
  ⚠️ C'était une fuite : les routes de détail ne filtraient pas `deleted_at`
  (donc un événement supprimé en douce restait lisible et modifiable).
- `POST /comptes/deconnexion/:idPublique` : inchangé (déjà en suppression douce).

**App**
- `selectionnerCalendriersGoogle` renvoie `{ jobId, calendriersDesactives }`.
- Toast « Sélection enregistrée. » / « N calendrier(s) retiré(s) de Sync. » au lieu de
  l'avertissement trompeur « aucun nouveau calendrier à importer » (l'app ne pouvait
  pas distinguer « rien n'a changé » de « j'ai retiré des calendriers »).
- i18n : `selectionSaved`, `calendarsRemoved_one/_other` (fr + en).

**Vérifié** (contrat rejoué contre l'API locale) : à la désactivation, l'événement
est **toujours en base** avec `deleted_at` renseigné, le calendrier est conservé avec
`actif = 0`, `GET /evenements/<id>` → 403, la désactivation fonctionne avec un compte
en erreur, la réactivation avec un compte en erreur → 409 `google_reauth`.

### Complément (21/10/2026) — import Google : upsert + restauration
Demande user : « les événements qui sont retrouvés soient un soft delete, les nouveaux
simplement créés ; un ON DUPLICATE UPDATE avec `deleted_at = NULL` ».

**`sync_api/src/functions/google.js`**
- L'import ne détruit plus pour reconstruire. `importCalendar` est scindé en
  `fetchEvents` (appel Google) + `appliquerImport` (écriture en base), ce qui rend le
  second testable **sans compte Google** (`tests/import_google_check.js`).
- `appliquerImport` fait, dans une seule transaction :
  1. `UPDATE evenements SET deleted_at = NOW() WHERE calendrier_id = ? AND fenêtre`
     → tout ce que Google a dans la fenêtre passe en suppression douce ;
  2. `INSERT … ON DUPLICATE KEY UPDATE debut=…, fin=…, titre=…, deleted_at = NULL`
     → les événements **retrouvés** sont restaurés et mis à jour, les **nouveaux** sont
     créés.
  L'ordre (soft delete puis upsert) évite d'avoir à distinguer « vu » / « pas vu » à la
  seconde près — une première version avec un marqueur `updated_at` avait ce défaut
  (le marqueur était en millisecondes alors que la colonne est en secondes : les
  événements juste restaurés étaient supprimés dans la foulée).
- Le conflit porte sur `(createur_id, uuid_externe)` (l'identité stable de l'événement
  chez Google). `id_publique` et `slug` ne sont pas touchés → **ils restent stables d'un
  import à l'autre** (un lien partagé vers un événement importé ne casse plus).
- Optimisation : un nouvel `id_publique` n'est généré que pour les événements vraiment
  nouveaux (avant : une requête d'unicité par événement, y compris pour ceux qui
  existaient déjà).

**🐞 Bug trouvé au passage (l'import Google n'a jamais fonctionné)**
- Le code utilisait `id_calendrier` alors que la colonne s'appelle **`calendrier_id`**
  (dans le `DELETE` et l'`INSERT`). L'import levait `ER_BAD_FIELD_ERROR` → le job
  échouait à chaque fois, la progression SSE affichait toujours une erreur. Corrigé.

**Comportement différé avec l'import `.ics`** (volontaire)
- `POST /evenements/import` ne ressuscite **jamais** un événement supprimé en douce
  (« on ne le recrée pas ») : un fichier `.ics` ne porte pas l'information de
  suppression, le ressusciter annulerait les suppressions faites par l'utilisateur.
- L'import Google, lui, ressuscite : Google est la source de vérité d'un calendrier
  connecté, et c'est ce qui fait que **réactiver** un calendrier désactivé rend ses
  événements visibles à nouveau.

**Vérifié** : `node tests/import_google_check.js` → 12/12 (A retrouve son id et son
nouvel horaire, B est restauré, C est supprimé en douceur et reste en base, D est
créé, aucun doublon). `tsc` 5 erreurs (préexistantes), `eslint` 0, `jest` 8/8.

### Complément (21/10/2026) — URI de redirection OAuth : contrainte de la console Google
La nouvelle console Google n'expose une section « Authorized redirect URIs » que pour
le client **WEB**. Pour les clients Android/iOS, Google **génère** l'URI à partir du
package / bundle id et elle n'est pas modifiable.

Comme le package Android et le bundle id iOS valent tous deux `com.alkemist.sync`,
l'URI auto-générée est la même pour les deux clients : `com.alkemist.sync:/oauth2redirect`.

Conséquences :
- `app.json` : `expo.scheme` passe de `"sync"` à `["sync", "com.alkemist.sync"]`
  (`expo.scheme` accepte un tableau) → l'app continue de gérer les liens `sync://`
  existants et reçoit en plus le retour OAuth de Google.
- `sync_api/.env` : `GOOGLE_REDIRECT_URI=com.alkemist.sync:/oauth2redirect`.
- `sync_api/src/routes/comptes.js` : `GET /comptes/google/config` sert cette URI —
  l'app ne la duplique jamais.
- ⚠️ `expo run:android` / `run:ios` ne rejouent `prebuild` que si le dossier natif est
  absent (`ensureNativeProject.js` → `if (!existsSync(platform))`). Comme `android/` et
  `ios/` existent ici, il faut **lancer `npx expo prebuild` avant le run**, sinon le
  nouveau scheme n'est pas dans le `AndroidManifest` / `Info.plist`.
- Vérificateur : `node /tmp/opencode/check_redirect.js <client_id>` interroge
  l'authorization endpoint et dit si l'URI est acceptée (et distingue « client WEB »
  de « URI non enregistrée »).

### Complément (21/10/2026) — un client OAuth Google par plateforme
Décision user : « le client envoie son OS et je prends la bonne clé ».

**`sync_api/src/config/googleClients.js` (nouveau)** — registre des clients :
- variables : `GOOGLE_OAUTH_CLIENT_ID|SECRET|REDIRECT_URI` (défaut) +
  `..._ANDROID` / `..._IOS` ;
- `get(plateforme)`, `parClientId(clientId)`, `parClientEnregistre(clientId)` ;
- garde-fou : une plateforme dont le `client_id` est posé mais pas le secret retombe
  **entièrement** sur le client par défaut (sinon l'échange utiliserait le secret
  d'un autre client et échouerait de façon incompréhensible).

**Règle Google qui a dicté l'architecture** : un `refresh_token` est lié au client
qui l'a émis. D'où la migration `20261021153000_ADD_oauth_client_id_to_comptes_externes.js`
(colonne `comptes_externes.oauth_client_id`, appliquée en base : batch 13) : l'API
mémorise le `client_id` ayant servi à lier le compte, et rafraîchit avec ce client.

**Modifications**
- `src/functions/google.js` : `makeClient(client)` et `exchangeCode(code, verifier, client)`
  prennent le client du registre ; `importCalendar` reçoit `client` (le refresh
  doit utiliser le bon client_id).
- `src/routes/comptes.js` : `GET /comptes/google/config?platform=ios|android` renvoie
  le client de la plateforme (+ `plateforme`) ; `POST /comptes/google/connexion` résout
  le client par le `client_id` envoyé par l'app (le code est lié à ce client) et
  enregistre `oauth_client_id` sur le compte.
- `src/routes/calendriers.js` : les requêtes de comptes sélectionnent `oauth_client_id`
  ; le client est résolu pour `listCalendars` et pour chaque job d'import.
- App : `chargerConfigGoogle(api, plateforme)` (`?platform=ios|android`) et
  `connecterCompteGoogle(api, code, verifier, clientId)` — le `client_id` repart avec
  le code, le secret ne quitte jamais le serveur.

**Le client par défaut reste le client WEB** : le compte déjà lié en base (membre 13)
a été obtenu avec lui, son refresh continue de fonctionner (`oauth_client_id` NULL →
repli sur le défaut). Les comptes nouveaux, eux, mémorisent leur client.

**Vérifié** : migration appliquée, `GET /comptes/google/config` et `?platform=…`
répondent, garde-fou du secret vide OK, `tsc` 5 (préexistantes), `eslint` 0, `jest` 8/8.

### Complément (21/10/2026) — clients installés = « public clients » (pas de secret)
Vérifié empiriquement contre le token endpoint de Google :

| client_id + secret | réponse Google |
|---|---|
| Android + **secret du client WEB** | ❌ `invalid_client — The provided client secret is invalid.` |
| Android + **aucun secret** | ✅ `invalid_grant — Malformed auth code.` (client accepté) |
| WEB + son secret | ✅ accepté |

→ Le `client_secret` est lié à son client : celui du client WEB ne peut **pas** servir
avec le client Android/iOS. Un client installé (Android/iOS) est un *public client* :
Google ne lui donne pas de secret et l'échange du code se fait **sans secret** — c'est
le rôle du `code_verifier` PKCE.

**`src/config/googleClients.js`** : un client de plateforme n'a besoin que de son
`client_id` ; son secret est optionnel (vide → public client). Le secret du client par
défaut n'est **jamais** hérité par un client de plateforme (sinon `invalid_client`).
Garde-fou révisé : une plateforme est configurée dès qu'elle a un `client_id`.

**`sync_api/.env`** : `GOOGLE_OAUTH_SECRET_ANDROID` / `_IOS` à laisser **vides**.

**État vérifié** :
```
défaut    → client …brire8uvr…  secret: présent        (compte déjà lié en base)
android   → client …jarvpnekm…  secret: AUCUN          (public client)
ios       → client …qkd2ulqk…   secret: AUCUN          (public client)
```
Les deux clients acceptent `com.alkemist.sync:/oauth2redirect` (vérifié via
`/tmp/opencode/check_redirect.js`).
