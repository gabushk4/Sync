/**
 * Petit magasin en mémoire (même patron que events/authEvents.ts) pour faire
 * transiter le résultat du parsing .ics entre l'écran d'import
 * (profile/importCalendrier.tsx) et la modale de résolution de conflits
 * (modals/resolutionConflitImport.tsx), sans devoir créer un Context complet
 * pour un état aussi éphémère (il ne survit pas à un redémarrage de l'app,
 * et n'a pas besoin de survivre plus longtemps que ces deux écrans).
 */

let importEnCours = null
export function definirImportEnCours(etat){
    importEnCours = etat
}

export function obtenirImportEnCours(){
    return importEnCours
}

export function viderImportEnCours(){
    importEnCours = null
}