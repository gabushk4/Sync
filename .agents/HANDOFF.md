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

# HANDOFF — Philip (branche `philip-dev-s1`, 10-11/10/2026) : calendrier (US5), conflits / invitations (US8), rectifications d'affichage

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
- Commentaires JSDoc avec `@author Philip — user story 5` (calendrier),
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
  retirer des conflits. JSDoc `@author Philip — user story 8` partout.
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

## État final (11/10/2026) — Philip
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

## « Jour entier » : dates d'une plage du calendrier conservées (13/10/2026) — Philip
- `components/datetimeSelecteurs.tsx` (`basculerJourEntier`) : désactiver Jour entier sur une
  plage du calendrier gardait « aujourd'hui + 1 h → début + 1 h » ; les jours sont maintenant
  conservés (début = 1er jour à l'heure suivante, fin = dernier jour une heure plus tard).
- `create.tsx` : retrait de `useRouter` / `useAccessToken` utilisés sans import (reste de la
  fusion `fix/T6-dead-code` dans `main` → la création plantait).
- Doc : `docs/12-jour-entier.md` (lien dans `docs/README.md`).
- Bug hors sujet noté (non corrigé, T13) : `app/(tabs)/home/edit/[event].tsx:161` appelle
  `useActionFab` avec l'ancienne signature → l'écran de modification devrait planter.

## Plages libres de l'horaire du membre — sélection (20/10/2026) — Philip
- Fait : sur la rangée du membre (accueil), chaque trou sans évènement est un bloc bleu pâle
  (`colors.disponible`, ajouté à `themes/generateTheme.ts`), grisé s'il est passé.
  Appui long (350 ms) puis glisser = sélection au pas de 15 min, bornée au trou de départ ;
  au relâchement : menu « Créer un évènement » (ouvre `create` avec `start`/`end`) ou
  « Ajouter une indisponibilité » (toast « bientôt » pour l'instant). Relâcher sur un
  évènement existant → toast d'erreur. Trou passé → toast « dans le passé ».
- Fichiers : `functions/trousHoraire.ts` (calcul pur + conversions position ↔ heure),
  `components/trousHoraire.tsx`, prop `arrierePlan` de `components/eventsList.tsx`,
  `app/(tabs)/home/index.tsx`, `locales/{fr,en}/home.json` (`plageLibre`),
  `tests/trousHoraire.test.js` (4/4).
- Reste : tester sur appareil (cohabitation de l'appui long avec le défilement horizontal
  et le tap sur les évènements) ; brancher « Ajouter une indisponibilité » (API + stockage).
- Mise à jour (20/10/2026) : les trous sont maintenant au style des dispos communes (contour
  bleu `colors.disponible`, fond transparent, libellé collant « Disponible » / « Date passée »).
- Mise à jour (20/10/2026) : défilement auto quand le doigt est tenu près d'un bord de la rangée
  (56 px, 60→260 px/s, s'arrête au bout du trou) ; le libellé du trou sélectionné est masqué.
  Limite : une sélection ne dépasse pas la fenêtre chargée au début de l'appui (7 jours).

## Indisponibilités — page de création (20/10/2026) — Philip
- Stockage : un évènement de `nature = 'indisponibilite'` (colonne enum ajoutée à `evenements`,
  pas `type` qui entrerait en collision avec le `type` récurrence/exception de formaterEvenement).
  Mêmes conflits, même affichage ; `prive` = raison non partagée avec les amis.
- API (sync_api, philip_dev, non commité) : migration `20261020000000_ADD_nature_to_evenements.js`
  (appliquée sur syncdb_dev), `bd/schema.sql`, middleware `lireNature` sur POST /evenements
  (titre optionnel → « Indisponible », pas de participants ni de récurrence), `creerEvenement`
  (nature), `formaterEvenement` / `retourConflit` / `trouverConflits` renvoient `nature`.
  Testé en local dans une transaction annulée (insertion, conflit, format).
- App : écran `app/(tabs)/home/indisponibilite.tsx` (EventForm `nature="indisponibilite"` :
  sans récurrence ni participants, raison optionnelle, partage de la raison, jour entier) ;
  route dans `home/_layout.tsx` ; le menu des plages libres l'ouvre avec la plage.
  Conflit (409) au moment de confirmer → toast d'erreur listant ce qui gêne
  (« Tu as déjà quelque chose cette journée-là » en jour entier).
- Reste : test sur appareil ; affichage distinct des indisponibilités sur la timeline et dans
  les détails (l'écran de détails les montre comme un évènement) ; modification / suppression.
- Mise à jour (20/10/2026) : menu de choix partagé `components/menuCreation.tsx` (« Créer un
  évènement » en bouton plein, « Ajouter une indisponibilité » en lien discret). Le « + » de
  l'accueil et du calendrier l'ouvre d'abord (`FabConfig.menuCreation`, géré dans `customTabBar`),
  avec les mêmes params pour les deux écrans ; la sélection d'une plage libre l'utilise aussi.
- Mise à jour (20/10/2026) : indisponibilités en rouge sur la rangée du membre (`colors.indisponible`,
  via `couleur` de ListItem). Rectification `create.tsx` (`retour`) : le profil de l'ami s'affiche
  d'abord, puis la création est retirée de la pile de l'accueil (l'horaire apparaissait entre les deux).
- Mise à jour (20/10/2026) : tout ce travail est la user story 20 (étiquettes @author mises à jour, app + API).
  Répétition retirée : `functions/positionTimeline.ts` (positionHeures / heuresVersDate, partagé par
  ListItem, FreeSlotItem, TrousHoraire) ; `plagePreremplie` / `debutDejaPasse` dans `functions/jourCreation.ts`
  (create.tsx + indisponibilite.tsx) ; `components/voileEnvoi.tsx`. Jest 7/7 ; ESLint home/index : 13 erreurs
  comme avant (T11), aucune nouvelle.
- Correction (20/10/2026) : le retour via `beforeRemove` + `preventDefault` de create.tsx plantait sur iOS
  (« removed natively but didn't get removed from JS state », non supporté par native-stack). Remplacé :
  depuis le profil d'un ami, la création s'ouvre dans la pile du profil (`app/(tabs)/profile/create.tsx`,
  ré-export de home/create, param `depuis: 'profil'`) ; le retour natif revient au profil, et après création
  `goBack()`. Param `retour` supprimé (create.tsx, ouvrirCreationAvecAmi, widgetDisposCommunes).
