# Tickets CI — par priorité (T1 → T12)

Ordre d'exécution séquentiel : chaque ticket débloque la suite. Assignation
suggérée : l'auteur du fichier (`git log -- <fichier>`) le corrige dans sa
branche, sans toucher au comportement. Critère commun : `npx eslint <fichiers>`
→ 0 erreur et `npm run typecheck` ne gagne aucune nouvelle erreur.

## Débloquer la CI (T1 → T5)

- [D] **T1 — Nettoyer le test du composant supprimé (débloque le job test en strict)**
  Décision user (10/10/2026) : la suppression de `components/StyledText.tsx`
  et `components/Themed.tsx` est assumée.
  Action : supprimer `components/__tests__/StyledText-test.js` (il importe
  `../StyledText`, module inexistant), puis retirer
  `--testPathIgnorePatterns "StyledText-test"` du job `test` de la CI.
  Acceptation : `npm run test` vert sans exception.
  ⚠️ Ne pas oublier T2 : `components/EditScreenInfo.tsx` importe encore
  `MonoText` depuis le module supprimé.
- [D] **T2 — Imports cassés par la suppression T1 (3 erreurs tsc TS2307, petit ticket)**
  `app/modal.tsx:6` (`@/components/Themed`), `components/EditScreenInfo.tsx:5-6`
  (`./StyledText`, `./Themed`). Migrer vers `react-native` (ou abstraction
  existante), sans changer le comportement.
- [D] **T3 — `abstractions/touchableOpacityAbs.tsx:23` (3 erreurs tsc)**
  `Text` non défini/importé (`react/jsx-no-undef`) + props JSX invalides
  (TS2607/TS2786).
- [D] **T4 — `svgs/appIcon.tsx:11`, `svgs/closeMenu.tsx:11`, `svgs/hamburgerMenu.tsx:11` (3 erreurs tsc)**
  Prop `xmlns` rejetée par les types `react-native-svg` (TS2322). Mécanique.
- [ ] **T5 — Re-bloquer le typecheck (dépend de T2, T3, T4, T13)**
  Quand `npx tsc --noEmit` sort en exit 0 : retirer `continue-on-error: true`
  du job `typecheck` dans `.github/workflows/ci.yml`. Sans ça, la CI reste
  aveugle aux nouvelles erreurs de types.

## Nettoyage mécanique (T6, avant les corrections sémantiques pour des diffs propres)

- [D] **T6 — Code mort : ~155 `no-unused-vars` + 18 `@typescript-eslint/no-unused-vars` (warnings)**
  Imports/variables inutilisés sur tout le projet. `npx eslint --fix` en
  corrige une partie automatiquement (vérifier le diff avant de pousser).
  Fichier le plus touché : `app/(tabs)/home/details/[eventId].tsx` (25 warnings).
  Idéal pour débuter. À merger avant T7-T11 si travail en parallèle
  (mêmes fichiers touchés, sinon conflits).

## Lint — corrections sémantiques, du plus ciblé au plus gros (T7 → T10)

- [ ] **T7 — `app/(modals)/ajouterAmi.tsx` (13 erreurs `react-hooks/rules-of-hooks`)**
  Un seul type de règle : bon ticket pour comprendre les règles des hooks.
- [ ] **T8 — `components/notificationItem.tsx` (15 `react-hooks/immutability` + 1 `set-state-in-effect`)**
  Mutations pendant le render (ex. shared values Reanimated) : vérifier le
  comportement à la review, pas de suite E2E dans le projet.
- [ ] **T9 — `app/(tabs)/profile/index.tsx` (7 `immutability`, 7 `static-components`, 1 `set-state-in-effect`)**
- [ ] **T10 — `components/modalBase.js` (12 `immutability` + 1 `no-var`) + `components/modalManager.js` (10 `import/no-unresolved`, 2 `jsx-no-undef`, 1 `no-children-prop`)**
  Le plus gros morceau (26 erreurs) : à découper en 2 commits/PR si besoin.

## Parallélisable + optionnel (T11, T12)

- [ ] **T11 — Petits fichiers (1 à 7 erreurs chacun, 1 mini-PR par fichier, parallélisable)**
  `app/(tabs)/home/index.tsx` (7 `immutability`), `app/scanQR.tsx` (3),
  `components/menuDeroulant.tsx` (3), `contextes/contexteListeOptions.js` (4),
  `app/(auth)/register.tsx` (2), `contextes/contexteEventDraft.tsx` (2),
  `contextes/contexteAuth.tsx` (2), `components/commonSlotsSuggestions.tsx` (2),
  `components/EditScreenInfo.tsx` → voir T2 (exclu d'ici),
  `locales/supported.js` (2),
  + ~10 fichiers à 1 erreur (`timeline.tsx`, `eventsList.tsx`, `listItem.tsx`,
  `listSeparator.tsx`, `requestStatus.tsx`, `pfp.tsx`, `participantLigne.tsx`,
  `participantsListe.tsx`, `chargementEcran.js`, `app/modal.tsx`,
  `abstractions/QrCodeAbs.tsx`, `abstractions/textInputAbs.tsx`).
  `abstractions/touchableOpacityAbs.tsx` → voir T3 (exclu d'ici).
- [ ] **T13 — Retombées tsc/lint de la PR #6 FAB-fix (prioritaire, bloque T5 ; à assigner à l'auteur de la PR #6)**
  tsc (4 erreurs) : `app/(tabs)/home/details/[eventId].tsx:172` et
  `app/(tabs)/inbox/index.tsx:51` (prop `visible` manquante pour `FabConfig`),
  `app/(tabs)/home/edit/[event].tsx:161` et `app/(tabs)/profile/edit.tsx:62`
  (`useFabActions` : 2 args attendus, 1 reçu).
  lint (6 erreurs) : `components/voiceRecorderButton.tsx` (2 `purity`
  `Date.now` pendant le render, 3 `refs` pendant le render),
  `hooks/useActionFAB.tsx` (1 `refs` pendant le render).
  Acceptation : `npx tsc --noEmit` et `npx eslint` sur ces 6 fichiers → 0 erreur.
  (Faux positif écarté : `expo-audio` "introuvable" venait d'un `node_modules`
  périmé en local, résolu par `npm ci` — la CI n'est pas concernée.)
- [ ] **T12 — Couverture Jest (optionnel, pour la fin)**
  Activer `collectCoverage` + seuils dans le bloc `jest` de `package.json`
  une fois la suite verte (doc https://docs.expo.dev/develop/unit-testing/).
