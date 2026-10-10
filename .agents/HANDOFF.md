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
