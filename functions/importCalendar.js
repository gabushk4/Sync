// API 'legacy' : c'est la seule qui fonctionne dans Expo Go (la nouvelle API d'expo-calendar,
// importée depuis 'expo-calendar', lance une erreur dans Expo Go). Elle marche aussi dans une build de dev.
import * as Calendar from 'expo-calendar/legacy'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { DateTime } from 'luxon'

import { convertUTCToLocal } from './convertirUTCenLocal'
import formaterDatePourServeur from './formaterDatePourServeur'
import log from './log'
import parseIcs from './parseIcs'

/**
 * Import de calendriers (stories #4 et #7) : depuis les calendriers du téléphone ou un fichier .ics.
 *
 * Les deux sources produisent le même format d'évènement, puis passent par le même traitement
 * (doublons, conflits, envoi au serveur) :
 *   { source: 'telephone' | 'ics', source_id, titre, description, debut: DateTime, fin: DateTime, jourFerie }
 *
 * source_id identifie l'évènement dans sa source d'origine (UID du .ics, identifiant du téléphone) :
 * le serveur s'en sert pour mettre à jour un évènement déjà importé au lieu de le dupliquer.
 */

export const TAILLE_LOT_IMPORT = 100
const JOURS_AVANT = 7
const ANS_APRES = 5

export class FichierNonIcsErreur extends Error {}

/* ------------------------------------------------------------------ */
/* Jours fériés                                                        */
/* ------------------------------------------------------------------ */

// Noms usuels des calendriers de jours fériés : "Jours fériés au Canada", "Holidays in Canada",
// "Canadian Holidays", "Feriados en...", "Feiertage in..."
const MOTS_FERIES = /holiday|f[ée]ri[ée]|feriado|festivo|feiertag/i
// Description des jours fériés dans les calendriers Google ("Public holiday", "Jour férié")
const DESCRIPTION_FERIE = /public holiday|jour f[ée]ri[ée]/i

/**
 * Un jour férié : un évènement toute la journée qui vient d'un calendrier de jours fériés
 * (ou qui se décrit lui-même comme tel). Les autres évènements toute la journée ne sont pas concernés.
 */
function estJourFerie({ jourEntier, nomCalendrier, categories, description }){
    if (!jourEntier) return false
    return MOTS_FERIES.test(nomCalendrier ?? '')
        || MOTS_FERIES.test(categories ?? '')
        || DESCRIPTION_FERIE.test(description ?? '')
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

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
        throw new FichierNonIcsErreur(fichier.name ?? '')
    }
    // SDK 54+ : readAsStringAsync n'existe plus dans 'expo-file-system' (seulement dans /legacy)
    return await new File(fichier.uri).text()
}

/** Texte .ics -> évènements au format commun. Les heures sans fuseau sont lues dans le fuseau du téléphone. */
export function evenementsDepuisIcs(texteIcs, titreParDefaut = 'Évènement'){
    const fuseauLocal = DateTime.local().zoneName
    return parseIcs(texteIcs, fuseauLocal)
        .filter((ev) => ev.debut?.isValid && ev.fin?.isValid && ev.fin > ev.debut)
        .map((ev) => ({
            source: 'ics',
            source_id: ev.uid,
            titre: (ev.titre?.trim() || titreParDefaut).slice(0, 255),
            description: ev.description?.trim() ?? '',
            debut: ev.debut,
            fin: ev.fin,
            jourFerie: estJourFerie(ev),
        }))
}

/**
 * Évènements des calendriers du téléphone choisis, de la semaine passée jusqu'à 5 ans.
 * @param {Calendar.Calendar[]} calendriers (tels que retournés par Calendar.getCalendarsAsync)
 */
export async function evenementsDepuisTelephone(calendriers, titreParDefaut = 'Évènement'){
    const debut = new Date()
    debut.setDate(debut.getDate() - JOURS_AVANT)
    const fin = new Date()
    fin.setFullYear(fin.getFullYear() + ANS_APRES)

    const evenements = await Calendar.getEventsAsync(calendriers.map((c) => c.id), debut, fin)
    // nom de chaque calendrier (et de son compte), pour reconnaître un calendrier de jours fériés
    const nomsCalendriers = new Map(calendriers.map((c) => [c.id, `${c.title ?? ''} ${c.source?.name ?? ''}`]))

    return evenements.flatMap((event) => {
        const debutEv = DateTime.fromJSDate(new Date(event.startDate)).toUTC()
        const finEv = DateTime.fromJSDate(new Date(event.endDate)).toUTC()
        if (event.status === Calendar.EventStatus.CANCELED || !event.id || !event.calendarId
            || !debutEv.isValid || !finEv.isValid || finEv <= debutEv) return []

        // un évènement récurrent renvoie le même id pour chaque occurrence : on y ajoute la date
        const sourceId = event.recurrenceRule
            ? `${event.calendarId}:${event.id}:${debutEv.toISO()}`
            : `${event.calendarId}:${event.id}`

        const details = [event.notes?.trim(), event.location?.trim()].filter(Boolean)
        return [{
            source: 'telephone',
            source_id: sourceId.slice(0, 255),
            titre: (event.title?.trim() || titreParDefaut).slice(0, 255),
            description: details.join('\n'),
            debut: debutEv,
            fin: finEv,
            jourFerie: estJourFerie({
                jourEntier: Boolean(event.allDay),
                nomCalendrier: nomsCalendriers.get(event.calendarId),
                description: event.notes,
            }),
        }]
    })
}

/* ------------------------------------------------------------------ */
/* Doublons et conflits                                                */
/* ------------------------------------------------------------------ */

const memeTitre = (a, b) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/**
 * Un "doublon" : mêmes début, fin et titre qu'un évènement déjà dans l'horaire du membre
 * (par exemple parce que le même fichier a déjà été importé) → ignoré.
 */
function estDoublon(importe, existant){
    // un jour férié déjà importé avant d'être reconnu comme tel est renvoyé au serveur,
    // qui le marque comme jour férié au lieu de le dupliquer
    if (importe.jourFerie && existant.jour_ferie === false) return false
    return memeCreneau(importe, existant) && memeTitre(importe.titre, existant.titre)
}

/**
 * Un "conflit" : deux évènements différents qui ont exactement le même début ET la même fin.
 * Les jours fériés ne causent jamais de conflit : plusieurs le même jour n'ont rien d'anormal,
 * et ils n'empêchent pas d'avoir d'autres évènements ce jour-là.
 */
function memeCreneau(a, b){
    return a.debut?.toMillis?.() === b.debut?.toMillis?.() && a.fin?.toMillis?.() === b.fin?.toMillis?.()
}

/**
 * @param {Array} evenementsImportes  évènements au format commun
 * @param {Array} evenementsExistants évènements déjà connus du membre (voir chargerEvenementsExistants)
 * @returns {{ aImporter: Array, ignores: Array, conflits: Array<{importe, existant}> }}
 */
export function dedupliquerEtDetecterConflits(evenementsImportes, evenementsExistants = []){
    const aImporter = []
    const ignores = []
    const conflits = []
    // les évènements déjà retenus de cet import : deux évènements du même import peuvent aussi entrer en conflit
    const dejaVus = []

    for(const importe of evenementsImportes){
        if (evenementsExistants.some((existant) => estDoublon(importe, existant))
            || dejaVus.some((autre) => estDoublon(importe, autre))) {
            ignores.push(importe)
            continue
        }

        const conflit = importe.jourFerie
            ? undefined
            : evenementsExistants.find((existant) => !existant.jour_ferie && memeCreneau(importe, existant))
                ?? dejaVus.find((autre) => !autre.jourFerie && memeCreneau(importe, autre))

        if (conflit) conflits.push({ importe, existant: conflit })
        else aImporter.push(importe)

        dejaVus.push(importe)
    }
    log('dedupliquerEtDetecterConflits', { aImporter: aImporter.length, ignores: ignores.length, conflits: conflits.length })

    return { aImporter, ignores, conflits }
}

/* ------------------------------------------------------------------ */
/* Serveur                                                             */
/* ------------------------------------------------------------------ */

/** Évènements du membre sur la période couverte par l'import (pour détecter doublons et conflits). */
export async function chargerEvenementsExistants(api, evenementsImportes){
    if (evenementsImportes.length === 0) return []

    let min = evenementsImportes[0].debut
    let max = evenementsImportes[0].fin
    for (const ev of evenementsImportes) {
        if (ev.debut < min) min = ev.debut
        if (ev.fin > max) max = ev.fin
    }

    const reponse = await api.get('/evenements', {
        params: {
            resource: 'evenements',
            debut: formaterDatePourServeur(min.toUTC()),
            fin: formaterDatePourServeur(max.toUTC()),
            limite: 5000,
            force_refresh: true,
        },
    })

    return (reponse.data?.evenements ?? []).flatMap((ev) => {
        try {
            return [{ ...ev, debut: convertUTCToLocal(ev.debut), fin: convertUTCToLocal(ev.fin) }]
        } catch {
            return []
        }
    })
}

/**
 * Envoie les évènements au serveur par lots.
 * @returns {Promise<{importes: number, misAJour: number, doublons: number, ignores: number}>}
 */
export async function envoyerEvenements(api, evenements){
    const total = { importes: 0, misAJour: 0, doublons: 0, ignores: 0 }

    for (let i = 0; i < evenements.length; i += TAILLE_LOT_IMPORT) {
        const lot = evenements.slice(i, i + TAILLE_LOT_IMPORT).map((ev) => ({
            source: ev.source,
            source_id: ev.source_id,
            titre: ev.titre,
            description: ev.description ?? '',
            debut: ev.debut.toUTC().toISO(),
            fin: ev.fin.toUTC().toISO(),
            jour_ferie: Boolean(ev.jourFerie),
        }))

        const { data } = await api.post('/evenements/import', { evenements: lot })
        total.importes += Number(data?.importes ?? 0)
        total.misAJour += Number(data?.mis_a_jour ?? 0)
        total.doublons += Number(data?.doublons ?? 0)
        total.ignores += Array.isArray(data?.ignores) ? data.ignores.length : 0
    }

    return total
}
