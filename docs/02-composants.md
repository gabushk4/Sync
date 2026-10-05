# 📁 CATÉGORIE : COMPOSANTS UI

## Fichiers de cette catégorie :
- `EditScreenInfo.tsx` - Informations sur l'écran d'édition (guide, version)
- `ExternalLink.tsx` - Lien externe avec gestion de navigation
- `StyledText.tsx` - Texte stylisé avec theming
- `Themed.tsx` - Wrapper thématique pour les composants
- `addFriendForm.tsx` - Formulaire d'ajout d'ami (pseudo, validation)
- `betaTag.tsx` - Badge "BETA" pour les fonctionnalités expérimentales
- `chargementEcran.js` - Écran de chargement (skeleton, spinner)
- `commonSlotsSuggestions.tsx` - Suggestions de créneaux communs
- `customTabBar.tsx` - Barre d'onglets personnalisée
- `datetimeSelecteurs.tsx` - Sélecteurs de date/heure (date, heure, fuseau)
- `demandeConfirmerCourriel.tsx` - Demande de confirmation d'email
- `eventBloc.tsx` - Bloc d'événement individuel (horizon, détails)
- `eventForm.tsx` - Formulaire d'événement (titre, description, date/durée, privé/public, participants, récurrent)
- `eventListAmi.tsx` - Liste d'événements d'amis
- `eventsList.tsx` - Liste d'événements horizontale (blocs colorés, chevauchement, événements récurrents)
- `freeSlotItem.tsx` - Élément de créneau libre
- `friendLine.tsx` - Ligne d'ami dans la liste
- `listItem.tsx` - Élément de liste générique
- `listSeparator.tsx` - Séparateur de liste
- `memberCode.tsx` - Code public du membre (hexadécimal, copie presse-pouce)
- `menuDeroulant.tsx` - Menu déroulant (dropdown, options)
- `modalBase.js` - Modal de base (overlay, contenu, actions)
- `modalManager.js` - Gestionnaire de modals (pile, ouverture, fermeture)
- `notificationItem.tsx` - Élément de notification
- `participantLigne.tsx` - Ligne de participant dans un événement
- `participantsListe.tsx` - Liste des participants d'un événement
- `pfp.tsx` - Photo de profil (chargement lazy, URLs externes, placeholder)
- `pingServeur.tsx` - Indicateur de ping du serveur
- `requestStatus.tsx` - Statut de requête (loading, success, error)
- `serverStatus.tsx` - Statut du serveur (online, offline, maintenance)
- `settingsRow.tsx` - Ligne de paramètres (label, valeur, actions)
- `timeline.tsx` - Composant timeline horizontal (heures, navigation, retour au présent)
- `toastAvertissement.js` - Toasts d'avertissement
- `toastErreur.js` - Toasts d'erreur
- `toastSucces.js` - Toasts de succès

## Composants principaux réutilisables :
1. **eventForm.tsx** - Formulaire pour créer/éditer/consulter des événements
2. **eventsList.tsx** - Affichage horizontal avec indicateurs de chevauchement
3. **pfp.tsx** - Photo de profil avec lazy loading
4. **timeline.tsx** - Navigation horizontale interactive
5. **memberCode.tsx** - Affichage et copie du code membre
6. **customTabBar.tsx** - Barre d'onglets personnalisée pour la navigation principale
7. **ExternalLink.tsx** - Lien externe avec gestion de navigation native
8. **StyledText.tsx** - Texte stylisé avec support du theming

## Composants de notification :
- Toasts avec 3 niveaux (succès, erreur, avertissement)
- `modalBase.js` - Modal générique pour les confirmations
- `modalManager.js` - Gestionnaire centralisé des modals

## Composants d'interface utilisateur :
- `chargementEcran.js` - Écran de chargement avec skeleton
- `pingServeur.tsx` - Indicateur de latence serveur
- `requestStatus.tsx` - Indicateur de statut de requête
- `serverStatus.tsx` - Indicateur de statut du serveur
- `betaTag.tsx` - Badge pour fonctionnalités bêta

## Composants de liste :
- `listItem.tsx` - Élément de liste générique
- `listSeparator.tsx` - Séparateur visuel entre groupes
- `friendLine.tsx` - Ligne représentant un ami
- `participantLigne.tsx` - Ligne représentant un participant
- `participantsListe.tsx` - Liste complète des participants

## Composants de formulaire :
- `addFriendForm.tsx` - Formulaire d'ajout d'ami
- `datetimeSelecteurs.tsx` - Sélecteurs de date et heure
- `demandeConfirmerCourriel.tsx` - Demande de confirmation email

## Composants d'événements :
- `eventBloc.tsx` - Bloc individuel d'événement
- `eventListAmi.tsx` - Liste d'événements d'amis
- `commonSlotsSuggestions.tsx` - Suggestions de créneaux libres

## Composants de profil :
- `settingsRow.tsx` - Ligne de configuration
- `freeSlotItem.tsx` - Élément de créneau disponible

[Status: Command completed]
