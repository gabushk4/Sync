import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'

import log from './log'

/**
 * Ouvre le sélecteur de fichiers et retourne le texte brut du .ics choisi,
 * ou null si l'utilisateur a annulé.
 */

export async function choisirFichierIcs(){
    const resultat = await DocumentPicker.getDocumentAsync({
        // '.ics' n'est pas un type MIME : on accepte tout et on vérifie l'extension
        type: '*/*',
        copyToCacheDirectory: true,
    })
    if(resultat.canceled || !resultat.assets?.[0]) return null

    const fichier = resultat.assets[0]
    if(!fichier.name?.toLowerCase().endsWith('.ics')){
        throw new Error('choisis un fichier .ics')
    }
    // SDK 54+ : readAsStringAsync n'existe plus dans 'expo-file-system' (seulement dans /legacy)
    return await new File(fichier.uri).text()
}
/**
 * Un "doublon" (story #7) : même évènement (même UUID) ET mêmes début/fin/titre
 * qu'un évènement déjà présent dans l'horaire du membre → ignoré silencieusement.
 */
function estDoublon(importe,existant){
    return (
        importe.uid === existant.id_publique && 
        importe.debut.toMillis() === existant.debut?.toMillis?.() &&
        importe.fin.toMillis() === existant.fin?.toMillis?.() && 
        importe.titre === existant.titre
    )
}

/**
 * Un "conflit" (story #7) : deux évènements distincts (par UID) qui partagent
 * exactement le même début ET la même fin. On regroupe ici aussi bien
 * import-vs-existant que import-vs-import, pour ne rien manquer.
 */

function memeCreneau(a,b){
    return a.debut.toMillis() === b.debut.toMillis() && a.fin.toMillis() === b.fin.toMillis()
}

/**
 * @param {Array} evenementsImportes  sortie de parseIcs()
 * @param {Array} evenementsExistants évènements déjà connus du membre (ex. GET /evenements/)
 * @returns {{ aImporter: Array, ignores: Array, conflits: Array<{importe, existant}> }}
 */


export function dedupliquerEtDetecterConflits(evenementsImportes,evenementsExistants = []){
    const aImporter = []
    const ignores = []
    const conflits = []
    // on retient aussi les conflits import-vs-import déjà traités pour éviter les doublons de conflit

    const dejaVus = []

    for(const importe of evenementsImportes){
        const doublon = evenementsExistants.find((existant) => estDoublon(importe,existant))
        if(doublon){
            ignores.push(importe)
            continue
        }
        const conflitExistant = evenementsExistants.find((existant) => memeCreneau(importe,existant))
        const conflitImporte = dejaVus.find((autre) => memeCreneau(importe,autre))

        if(conflitExistant){
            conflits.push({importe,existant:conflitExistant})
        } else if(conflitImporte){
            conflits.push({importe,existant:conflitImporte})
        }
        else {
            aImporter.push(importe)
        }
        dejaVus.push(importe)
    }
    log('dedupliquerEtDetecterConflits', { aImporter: aImporter.length, ignores: ignores.length, conflits: conflits.length })

    return {aImporter,ignores,conflits}

}