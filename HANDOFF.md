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
