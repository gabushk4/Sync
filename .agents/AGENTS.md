# Règles de travail

## Incertitude
- Ne devine jamais. Si une information manque (nom de champ, comportement,
  version d'une librairie), arrête-toi et pose-moi la question.

## Bugs
- Si tu trouves un bug hors du sujet de la tâche, ne le corrige pas.
  Ajoute une ligne dans HANDOFF.md (fichier, ligne, description) et continue.

## Gros fichiers
- Si un fichier dépasse 300 lignes, lis-le par blocs et traite-le
  bloc par bloc. N'assume jamais avoir lu un fichier que tu n'as pas
  lu en entier.

## Suivi (écris au fur et à mesure, pas à la fin)
- Maintiens HANDOFF.md : ce qui est fait, ce qui reste, ce que tu
  n'as pas pu faire et pourquoi.
- Si tu dois t'arrêter avant d'avoir fini, termine HANDOFF.md avec
  les instructions pour qu'un autre agent reprenne.

## Expo
- Version du projet : voir package.json. Pour toute API Expo, utilise
  @docs ou demande-moi. Ne te fie pas à ta mémoire.

## Structure du projet
- Dossier racine du projet: ~/Desktop/sync
- Le dossier est structurer comme tel:
    .
    ├── abstractions -> Couche d'abstraction par dessus des composants React-Native. (Purement pour le style ou pour DRY)
    ├── app
    │   ├── (auth)
    │   ├── (modals)
    │   └── (tabs)
    │       ├── feed
    │       │   └── notifications
    │       ├── home
    │       │   ├── details
    │       │   └── edit
    │       ├── inbox
    │       └── profile
    │           └── settings
    ├── assets
    │   ├── fonts
    │   ├── gifs
    │   ├── icones
    │   └── images
    ├── components
    │   └── __tests__
    ├── constants
    ├── contextes
    ├── docs
    ├── events
    ├── functions
    ├── hooks
    ├── locales
    │   ├── en
    │   └── fr
    ├── scripts
    ├── svgs
    ├── tests
    ├── themes
    └── types
