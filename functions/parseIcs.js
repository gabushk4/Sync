import {DateTime} from 'luxon'
import log from './log'


// "Déplie" les lignes .ics : une ligne qui commence par un espace ou une
// tabulation est la continuation de la ligne précédente (RFC 5545 §3.1).
function deplierLignes(texteIcs){
    const lignesBrutes = texteIcs.split(/\r\n|\n|\r/)
    const lignes = []

    for(const ligne of lignesBrutes) {
        if((ligne.startsWith(' ') || ligne.startsWith('\t')) && lignes.length > 0){
            // continuation : coller à la ligne précédente sans le premier caractère
            lignes[lignes.length - 1] += ligne.slice(1)
        }else {
            lignes.push(ligne.trimEnd())
        }
    }
    return lignes
}  

// Retire l'échappement standard .ics (\\, \;, \,, \n) des valeurs texte
function deechapper(valeur) {
    return valeur
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}
// Parse une ligne "NOM;PARAM1=X;PARAM2=Y:valeur" en {nom, params, valeur}
function parserLigne(ligne){
    const indexDeuxPoints = ligne.indexOf(':')
    if(indexDeuxPoints ===-1) return null
    
    const gauche = ligne.slice(0,indexDeuxPoints)
    const valeur = ligne.slice(indexDeuxPoints + 1)
    const [nom, ...paramsBruts] = gauche.split(";")
    
    const params = {}
    for(const p of paramsBruts){
        const [cle,val] = p.split('=')
        if(cle) params[cle.toUpperCase()] = val?.replace(/^"|"$/g, '') // TZID="America/Toronto"
    }
    return {nom: nom.toUpperCase(),params,valeur}
}
/**
 * Convertit une valeur DTSTART/DTEND .ics en DateTime (Luxon), toujours en UTC.
 *   - "20250614T170000Z"               → UTC explicite
 *   - "20250614T170000" + TZID=Zone    → heure locale dans cette zone, puis convertie en UTC
 *   - "20250614T170000" (sans TZID)    → supposée locale au fuseau du membre (fallback)
 *   - "20250614" (VALUE=DATE)          → évènement toute la journée (ex. jour férié), minuit
 *                                        dans le fuseau du membre, pour qu'il reste sur le bon jour
 */

/** true si la valeur est une date seule (évènement toute la journée, ex. un jour férié) */
function estDateSeule(champ){
    return champ.params.VALUE === 'DATE' || /^\d{8}$/.test(champ.valeur)
}

function parserDateIcs(champ,timezoneParDefault = 'UTC'){
    const {valeur,params} = champ

    if(estDateSeule(champ)){
        // minuit UTC décalerait le jour (ex. 20 h la veille à Montréal) : minuit local
        return DateTime.fromFormat(valeur,'yyyyMMdd',{zone: timezoneParDefault}).toUTC()
    }
    if(valeur.endsWith('Z')){
        return DateTime.fromFormat(valeur.slice(0,-1),"yyyyMMdd'T'HHmmss",{zone:'utc'})
    }

    const zone = params.TZID ?? timezoneParDefault
    return DateTime.fromFormat(valeur,"yyyyMMdd'T'HHmmss",{zone}).toUTC()
}

/**
  @param {string} texteIcs contenu brut du fichier .ics
 * @param {string} timezoneParDefaut fuseau à utiliser si DTSTART/DTEND n'a pas de TZID
 * @returns {Array<{uid, titre, description, categories, nomCalendrier, debut, fin, jourEntier}>} évènements, debut/fin en DateTime UTC
 */


  export default function parseIcs(texteIcs,timezoneParDefault = 'UTC'){
    const lignes = deplierLignes(texteIcs)

    const evenements = []
    let courant = null
    let dansAlarme = false
    // nom du calendrier exporté (ex. "Jours fériés au Canada"), sert à reconnaître les jours fériés
    let nomCalendrier = ''
    
    for(const ligne of lignes){
        if(ligne === 'BEGIN:VEVENT'){
            courant = {}
            continue
        }
        // un rappel (VALARM) a son propre DESCRIPTION, qui écraserait celui de l'évènement
        if(ligne === 'BEGIN:VALARM'){ dansAlarme = true; continue }
        if(ligne === 'END:VALARM'){ dansAlarme = false; continue }
        if(dansAlarme) continue
        if(ligne === 'END:VEVENT'){
            // un évènement toute la journée peut ne pas avoir de DTEND : il dure alors 1 jour
            if(courant?.jourEntier && courant?.debut && !courant?.fin){
                courant.fin = courant.debut.setZone(timezoneParDefault).plus({ days: 1 }).toUTC()
            }
            if(courant?.uid && courant?.debut && courant?.fin){
                evenements.push({ ...courant, nomCalendrier })
            } else{
                log('parseIcs: VEVENT ignoré (champs requis manquants', courant)
            }
            courant = null
            continue
        }
        const champ = parserLigne(ligne)
        if(!champ) continue
        if(!courant){
            if(champ.nom === 'X-WR-CALNAME') nomCalendrier = deechapper(champ.valeur).trim()
            continue
        }
        try{
            switch (champ.nom){
                case 'UID' :
                    courant.uid = champ.valeur.trim()
                    break
                case 'SUMMARY':
                    courant.titre = deechapper(champ.valeur)
                    break
                case 'DESCRIPTION':
                    courant.description = deechapper(champ.valeur)
                    break
                case 'CATEGORIES':
                    courant.categories = deechapper(champ.valeur)
                    break
                case 'DTSTART':
                    courant.debut = parserDateIcs(champ,timezoneParDefault)
                    courant.jourEntier = estDateSeule(champ)
                    break
                case 'DTEND':
                    courant.fin = parserDateIcs(champ,timezoneParDefault)
                    break
                default:
                    break
            }
            
        }catch(error){
            log('parseIcs: errur sur le champ',champ,error?.message)
        }
        
    }
    return evenements
  }