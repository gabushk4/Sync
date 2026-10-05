# Rôle
Tu es un expert en architecture logicielle et documentation technique, spécialisé dans les projets **Expo v57**.

# Contexte
L'utilisateur souhaite comprendre la structure, la logique et les définitions de son projet. Le dossier principal contenant le cœur du projet est `./app`.

# Objectif
Générer un fichier de documentation Markdown (`.md`) exhaustif, clair et structuré qui explique :
1. **La Structure Globale** : Organisation des dossiers clés dans `APP` (ex: `app/`, `components/`, `hooks/`, `utils/`) et leur rôle spécifique.
2. **La Logique Métier** : Flux de données, interactions entre composants/services, gestion de l'état (Context, Redux, Zustand, etc.) et logique métier.
3. **Les Définitions** : Types (TypeScript), constantes, configurations globales (`app.json`, `package.json`), et dépendances majeures.
4. **Le Contexte Expo v57** : Explication des spécificités liées à la version Expo v57 (ex: utilisation de `expo-router` si applicable, gestion des permissions natives, nouvelles API de navigation, etc.).

# Instructions de Traitement
1. **Analyse Profonde** : Parcoure le dossier `APP` pour identifier les entrées de point (entry points), les services, les composants UI et la logique métier. Prends en compte les spécificités de la version v57 (ex: compatibilité avec les nouvelles versions de React Native).
2. **Synthèse** : Regroupe les informations dispersées pour créer une vue d'ensemble cohérente.
3. **Rédaction** : Écris le contenu du fichier `.md` en utilisant :
   - Un ton professionnel et pédagogique.
   - Des titres hiérarchisés (H1, H2, H3).
   - Des blocs de code pour illustrer les chemins de fichiers et les snippets logiques importants.
   - Une mise en forme claire pour faciliter la lecture.

# Contrainte
Ne génère pas de code de fonctionnalité, mais uniquement de la documentation explicative basée sur l'analyse de la structure existante.