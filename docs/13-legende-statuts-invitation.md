# 13. Légende des statuts d'invitation (détails d'un évènement)

> Auteur : **Philip** — user story 9 (réponses des participants).
> Dernière mise à jour : 13/10/2026.

Dans la liste des participants d'un évènement, chaque ligne (`ParticipantLigne`) montre la
réponse du participant avec **une icône seule**, sans texte. Pour qu'un membre **invité**
comprenne ces icônes, une petite légende s'affiche sous la liste, dans l'écran **détails**
de l'évènement.

```
  Participants - 4
  [ligne] [ligne] [ligne]
  Voir plus
  ✓ ACCEPTÉ    🕐 EN ATTENTE    ✗ REFUSÉ      ← légende
  +
```

---

## Quand la légende s'affiche

| Écran | Légende |
|---|---|
| Détails d'un évènement, membre **invité** (`privilege_membre` ≠ `'editeur'`) | **Oui** |
| Détails d'un évènement, membre **éditeur** (créateur) | Non |
| Création d'un évènement | Non (personne n'a encore répondu) |
| Page de décision d'une invitation (ouverte depuis la revue ou le feed) | Non : la liste des participants y est cachée, et le panneau de décision écrit déjà le statut en toutes lettres |

---

## Icônes

| Statut (API) | Icône | Texte (fr / en) |
|---|---|---|
| `acceptee` | `icon-succes-checkmark.png` (crochet vert) | ACCEPTÉ / ACCEPTED |
| `en_attente` (ou statut inconnu) | `horloge-light-icon.png` / `horloge-dark-icon.png` selon le thème | EN ATTENTE / PENDING |
| `refusee` | `icon-erreur.png` (croix rouge) | REFUSÉ / DECLINED |

Les textes viennent des clés existantes `events:participantStatus.*` : aucune nouvelle
traduction. L'ordre (accepté, en attente, refusé) est le même que la légende de la revue
d'invitation.

Les icônes sont choisies par **une seule fonction**, `iconeStatutInvitation(statut, colorScheme)`,
utilisée à la fois par la légende et par `ParticipantLigne` : si une icône change, la ligne et
la légende restent identiques.

---

## Où est le code

| Fichier | Rôle |
|---|---|
| `components/legendeStatutsInvitation.tsx` | Composant `LegendeStatutsInvitation` (la rangée de 3 icônes + texte), fonction `iconeStatutInvitation`, constante `HAUTEUR_LEGENDE` (28). |
| `components/participantLigne.tsx` | Utilise `iconeStatutInvitation` au lieu de ses propres `require` d'icônes de statut. |
| `components/participantsListe.tsx` | Nouvelle prop `afficherLegende` : affiche la légende sous la liste (avant le bouton « + ») et ajoute `HAUTEUR_LEGENDE` à la hauteur animée du conteneur. |
| `components/eventForm.tsx` | Passe `afficherLegende={mode === 'details' && event.privilege_membre !== 'editeur'}`. |

---

## Comment tester

1. Se connecter avec un membre **invité** à un évènement (pas son créateur) → ouvrir l'évènement
   depuis l'accueil : la légende apparaît sous les participants, rien n'est coupé.
2. Basculer le thème clair / sombre : l'horloge change de couleur dans la légende comme dans
   les lignes.
3. Ouvrir un évènement **créé par soi** : pas de légende.
4. Créer un évènement : pas de légende.
5. Ouvrir une invitation depuis le feed (page de décision) : pas de légende, le panneau affiche
   les statuts en texte.
